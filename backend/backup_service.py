#!/usr/bin/env python3
"""
Sistema de Backups Automáticos con OAuth
- Backups de PostgreSQL cada 24h
- Guarda localmente (7 días)
- Sube a Google Drive (30 días)
- Exportación mensual a Excel
"""

import os
import sys
import pickle
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

# Google Drive con OAuth
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# Add app to path
sys.path.insert(0, '/app')
from app.database import SessionLocal
from app import models

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

# Carpetas locales
BACKUP_DIR = Path("/app/backups")
BACKUP_DIR.mkdir(exist_ok=True)

DB_BACKUP_DIR = BACKUP_DIR / "database"
DB_BACKUP_DIR.mkdir(exist_ok=True)

EXCEL_BACKUP_DIR = BACKUP_DIR / "excel"
EXCEL_BACKUP_DIR.mkdir(exist_ok=True)

# Google Drive OAuth
TOKEN_FILE = "/app/token.pickle"
SCOPES = ['https://www.googleapis.com/auth/drive.file']

# IDs de carpetas en Google Drive
BD_FOLDER_ID = "1Z2UGSX7s42ywkOIQB3pNqqVqBErP64Qc"  # BD-Backups
EXCEL_FOLDER_ID = "1UxKFx8rauvAloR3z3E8qj8nsRkNfnesr"  # Excel-Historico

# Retención
LOCAL_RETENTION_DAYS = 7
DRIVE_RETENTION_DAYS = 30

# ============================================================================
# GOOGLE DRIVE HELPER (OAuth)
# ============================================================================

class GoogleDriveService:
    def __init__(self):
        self.service = None
        self.bd_folder_id = BD_FOLDER_ID
        self.excel_folder_id = EXCEL_FOLDER_ID
        
    def authenticate(self):
        """Autenticar con Google Drive usando OAuth"""
        try:
            if not os.path.exists(TOKEN_FILE):
                print("❌ Token no encontrado. Ejecuta primero:")
                print("   docker-compose exec backend python3 authenticate_oauth.py")
                return False
            
            # Cargar credenciales guardadas
            with open(TOKEN_FILE, 'rb') as token:
                creds = pickle.load(token)
            
            # Refrescar si es necesario
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                with open(TOKEN_FILE, 'wb') as token:
                    pickle.dump(creds, token)
            
            self.service = build('drive', 'v3', credentials=creds)
            print("✓ Autenticado con Google Drive (OAuth)")
            
            return True
        except Exception as e:
            print(f"❌ Error autenticando con Google Drive: {e}")
            return False
    
    def upload_file(self, file_path, folder_id):
        """Subir archivo a Google Drive"""
        try:
            file_metadata = {
                'name': Path(file_path).name,
                'parents': [folder_id]
            }
            media = MediaFileUpload(file_path, resumable=True)
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            print(f"✓ Subido a Drive: {Path(file_path).name}")
            return file.get('id')
        except Exception as e:
            print(f"❌ Error subiendo {Path(file_path).name}: {e}")
            return None
    
    def delete_old_files(self, folder_id, days):
        """Eliminar archivos antiguos de Google Drive"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            cutoff_str = cutoff_date.isoformat() + 'Z'
            
            query = f"'{folder_id}' in parents and createdTime < '{cutoff_str}' and trashed=false"
            results = self.service.files().list(q=query, fields="files(id, name)").execute()
            files = results.get('files', [])
            
            for file in files:
                self.service.files().delete(fileId=file['id']).execute()
                print(f"✓ Eliminado de Drive: {file['name']}")
            
            return len(files)
        except Exception as e:
            print(f"❌ Error eliminando archivos antiguos: {e}")
            return 0

# ============================================================================
# BACKUP DE BASE DE DATOS
# ============================================================================

def create_db_backup():
    """Crear backup de PostgreSQL"""
    print("\n📦 Creando backup de base de datos...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sql"
    filepath = DB_BACKUP_DIR / filename
    
    # Configuración de BD desde variables de entorno
    db_host = os.getenv("POSTGRES_HOST", "db")
    db_port = os.getenv("POSTGRES_PORT", "5432")
    db_name = os.getenv("POSTGRES_DB", "parking_db")
    db_user = os.getenv("POSTGRES_USER", "postgres")
    db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
    
    # Crear backup con pg_dump
    env = os.environ.copy()
    env['PGPASSWORD'] = db_password
    
    try:
        cmd = [
            'pg_dump',
            '-h', db_host,
            '-p', db_port,
            '-U', db_user,
            '-d', db_name,
            '-F', 'c',  # Formato custom (comprimido)
            '-f', str(filepath)
        ]
        
        subprocess.run(cmd, env=env, check=True, capture_output=True)
        print(f"✓ Backup creado: {filename}")
        
        # Obtener tamaño
        size_mb = filepath.stat().st_size / (1024 * 1024)
        print(f"  Tamaño: {size_mb:.2f} MB")
        
        return filepath
    except subprocess.CalledProcessError as e:
        print(f"❌ Error creando backup: {e.stderr.decode()}")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def cleanup_local_backups():
    """Eliminar backups locales antiguos"""
    print("\n🧹 Limpiando backups locales antiguos...")
    
    cutoff_date = datetime.now() - timedelta(days=LOCAL_RETENTION_DAYS)
    deleted = 0
    
    for backup_file in DB_BACKUP_DIR.glob("backup_*.sql"):
        # Extraer fecha del nombre
        try:
            date_str = backup_file.stem.split('_')[1]
            file_date = datetime.strptime(date_str, "%Y%m%d")
            
            if file_date < cutoff_date:
                backup_file.unlink()
                deleted += 1
                print(f"✓ Eliminado: {backup_file.name}")
        except Exception as e:
            print(f"⚠️  No se pudo procesar {backup_file.name}: {e}")
    
    print(f"✓ Eliminados {deleted} backups locales")
    return deleted

# ============================================================================
# EXPORTACIÓN A EXCEL
# ============================================================================

def export_monthly_excel():
    """Exportar datos del mes pasado a Excel"""
    print("\n📊 Exportando datos a Excel...")
    
    try:
        import pandas as pd
        from openpyxl import load_workbook
        from openpyxl.styles import Font, PatternFill, Alignment
    except ImportError:
        print("❌ Instala pandas y openpyxl: pip install pandas openpyxl")
        return None
    
    db = SessionLocal()
    
    try:
        # Mes pasado
        today = datetime.now()
        first_day_current_month = today.replace(day=1)
        last_day_prev_month = first_day_current_month - timedelta(days=1)
        first_day_prev_month = last_day_prev_month.replace(day=1)
        
        month_name = last_day_prev_month.strftime("%Y_%m_%B")
        filename = f"Historico_{month_name}.xlsx"
        filepath = EXCEL_BACKUP_DIR / filename
        
        # Si ya existe, no volver a crear
        if filepath.exists():
            print(f"⚠️  Ya existe: {filename}")
            return filepath
        
        print(f"📅 Exportando mes: {last_day_prev_month.strftime('%B %Y')}")
        
        # Consultas
        stays = db.query(models.Stay).filter(
            models.Stay.check_in_time >= first_day_prev_month,
            models.Stay.check_in_time < first_day_current_month,
            models.Stay.status == models.StayStatus.COMPLETED
        ).all()
        
        blacklist = db.query(models.Blacklist).filter(
            models.Blacklist.incident_date >= first_day_prev_month,
            models.Blacklist.incident_date < first_day_current_month
        ).all()
        
        history = db.query(models.HistoryLog).filter(
            models.HistoryLog.timestamp >= first_day_prev_month,
            models.HistoryLog.timestamp < first_day_current_month
        ).all()
        
        # Crear DataFrames
        df_stays = pd.DataFrame([{
            'ID': s.id,
            'Matrícula': s.vehicle.license_plate,
            'Tipo Vehículo': s.vehicle.vehicle_type,
            'Check-in': s.check_in_time,
            'Check-out': s.check_out_time,
            'Plaza': f"{s.parking_spot.spot_type}-{s.parking_spot.spot_number}" if s.parking_spot else '',
            'Precio': s.final_price,
            'Estado Pago': s.payment_status.value,
            'Pago Adelantado': s.prepaid_amount or 0
        } for s in stays])
        
        df_blacklist = pd.DataFrame([{
            'ID': b.id,
            'Matrícula': b.license_plate,
            'Motivo': b.reason,
            'Deuda': b.amount_owed,
            'Fecha': b.incident_date,
            'Notas': b.notes or '',
            'Resuelto': 'Sí' if b.resolved else 'No'
        } for b in blacklist])
        
        df_history = pd.DataFrame([{
            'ID': h.id,
            'Stay ID': h.stay_id,
            'Acción': h.action,
            'Fecha': h.timestamp,
            'Usuario': h.user.username if h.user else '',
            'Detalles': str(h.details) if h.details else ''
        } for h in history])
        
        # Resumen
        total_ingresos = sum([s.final_price for s in stays if s.final_price])
        total_sinpas = sum([b.amount_owed for b in blacklist])
        
        df_resumen = pd.DataFrame([{
            'Métrica': 'Total Vehículos',
            'Valor': len(stays)
        }, {
            'Métrica': 'Total Ingresos (€)',
            'Valor': total_ingresos
        }, {
            'Métrica': 'Nuevos SINPAS',
            'Valor': len(blacklist)
        }, {
            'Métrica': 'Deuda SINPAS (€)',
            'Valor': total_sinpas
        }])
        
        # Guardar Excel
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df_resumen.to_excel(writer, sheet_name='Resumen', index=False)
            df_stays.to_excel(writer, sheet_name='Estancias', index=False)
            df_blacklist.to_excel(writer, sheet_name='SINPAS', index=False)
            df_history.to_excel(writer, sheet_name='Historial', index=False)
        
        print(f"✓ Excel creado: {filename}")
        print(f"  - {len(stays)} estancias")
        print(f"  - {total_ingresos:.2f}€ ingresos")
        print(f"  - {len(blacklist)} sinpas")
        
        return filepath
        
    except Exception as e:
        print(f"❌ Error exportando Excel: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Ejecutar backup completo"""
    print("=" * 60)
    print("🔄 SISTEMA DE BACKUPS AUTOMÁTICOS")
    print("=" * 60)
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Crear backup de BD
    backup_file = create_db_backup()
    
    if not backup_file:
        print("\n❌ No se pudo crear el backup")
        return 1
    
    # 2. Subir a Google Drive
    drive = GoogleDriveService()
    if drive.authenticate():
        drive.upload_file(backup_file, drive.bd_folder_id)
        
        # Limpiar archivos antiguos en Drive
        deleted = drive.delete_old_files(drive.bd_folder_id, DRIVE_RETENTION_DAYS)
        print(f"✓ Eliminados {deleted} backups antiguos de Drive")
    
    # 3. Limpiar backups locales antiguos
    cleanup_local_backups()
    
    # 4. Exportación mensual (solo el día 1)
    if datetime.now().day == 1:
        excel_file = export_monthly_excel()
        if excel_file and drive.service:
            drive.upload_file(excel_file, drive.excel_folder_id)
    
    print("\n" + "=" * 60)
    print("✅ BACKUP COMPLETADO")
    print("=" * 60)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())