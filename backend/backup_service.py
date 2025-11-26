#!/usr/bin/env python3
"""
Sistema de Backups Automáticos con OAuth
- Backups de PostgreSQL cada 24h
- Guarda localmente (7 días)
- Sube a Google Drive (TODOS, sin borrar)
- Exportación mensual a Excel
"""

import os
import sys
import pickle
import subprocess
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
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

# Retención LOCAL (Drive guarda TODOS)
LOCAL_RETENTION_DAYS = 7

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

# ============================================================================
# BACKUP DE BASE DE DATOS
# ============================================================================

def create_db_backup():
    """Crear backup de PostgreSQL"""
    print("\n📦 Creando backup de base de datos...")
    
    timestamp = datetime.now(ZoneInfo("Europe/Madrid")).strftime("%Y%m%d_%H%M%S")
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
    """Eliminar backups locales antiguos (>7 días)"""
    print("\n🧹 Limpiando backups locales antiguos...")
    
    cutoff_date = datetime.now(ZoneInfo("Europe/Madrid")) - timedelta(days=LOCAL_RETENTION_DAYS)
    deleted = 0
    
    for backup_file in DB_BACKUP_DIR.glob("backup_*.sql"):
        try:
            # Extraer fecha y hora del nombre del archivo
            parts = backup_file.stem.split('_')
            if len(parts) >= 3:
                date_str = parts[1]  # YYYYMMDD
                time_str = parts[2]  # HHMMSS
                
                # Parsear con timezone
                file_datetime = datetime.strptime(f"{date_str}_{time_str}", "%Y%m%d_%H%M%S")
                file_datetime = file_datetime.replace(tzinfo=ZoneInfo("Europe/Madrid"))
                
                if file_datetime < cutoff_date:
                    backup_file.unlink()
                    deleted += 1
                    print(f"✓ Eliminado: {backup_file.name}")
        except Exception as e:
            print(f"⚠️  No se pudo procesar {backup_file.name}: {e}")
    
    print(f"✓ Eliminados {deleted} backups locales (>{LOCAL_RETENTION_DAYS} días)")
    return deleted

# ============================================================================
# EXPORTACIÓN A EXCEL
# ============================================================================

def export_monthly_excel():
    """Exportar datos del mes pasado a Excel"""
    print("\n📊 Exportando datos a Excel...")
    
    try:
        import pandas as pd
    except ImportError:
        print("❌ Instala pandas y openpyxl: pip install pandas openpyxl")
        return None
    
    db = SessionLocal()
    
    try:
        # Mes pasado
        today = datetime.now(ZoneInfo("Europe/Madrid"))
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
        
        # ========================================================================
        # CONSULTAS
        # ========================================================================
        
        # Estancias
        stays = db.query(models.Stay).filter(
            models.Stay.check_in_time >= first_day_prev_month,
            models.Stay.check_in_time < first_day_current_month,
            models.Stay.status == models.StayStatus.COMPLETED
        ).all()
        
        # Lista negra
        blacklist = db.query(models.Blacklist).filter(
            models.Blacklist.incident_date >= first_day_prev_month,
            models.Blacklist.incident_date < first_day_current_month
        ).all()
        
        # Historial
        history = db.query(models.HistoryLog).filter(
            models.HistoryLog.timestamp >= first_day_prev_month,
            models.HistoryLog.timestamp < first_day_current_month
        ).all()
        
        # Sesiones de caja
        cash_sessions = db.query(models.CashSession).filter(
            models.CashSession.opened_at >= first_day_prev_month,
            models.CashSession.opened_at < first_day_current_month
        ).all()
        
        # Transacciones de caja
        cash_transactions = db.query(models.CashTransaction).filter(
            models.CashTransaction.timestamp >= first_day_prev_month,
            models.CashTransaction.timestamp < first_day_current_month
        ).all()
        
        # ========================================================================
        # CREAR DATAFRAMES
        # ========================================================================
        
        # Estancias
        df_stays = pd.DataFrame([{
            'ID': s.id,
            'Matrícula': s.vehicle.license_plate,
            'País': s.vehicle.country or '',
            'Tipo Vehículo': s.vehicle.vehicle_type,
            'Check-in': s.check_in_time,
            'Check-out': s.check_out_time,
            'Plaza': f"{s.parking_spot.spot_type}-{s.parking_spot.spot_number}" if s.parking_spot else '',
            'Precio': s.final_price,
            'Método Pago': s.payment_method.value if s.payment_method else '',
            'Importe Pagado': s.amount_paid or 0,
            'Cambio Devuelto': s.change_given or 0,
            'Estado Pago': s.payment_status.value,
            'Pago Adelantado': s.prepaid_amount or 0,
            'Registrado en Caja': 'Sí' if s.cash_registered else 'No'
        } for s in stays])
        
        # Lista negra
        df_blacklist = pd.DataFrame([{
            'ID': b.id,
            'Matrícula': b.license_plate,
            'Motivo': b.reason,
            'Deuda': b.amount_owed,
            'Fecha': b.incident_date,
            'Notas': b.notes or '',
            'Resuelto': 'Sí' if b.resolved else 'No'
        } for b in blacklist])
        
        # Historial
        df_history = pd.DataFrame([{
            'ID': h.id,
            'Stay ID': h.stay_id,
            'Acción': h.action,
            'Fecha': h.timestamp,
            'Usuario': h.user.username if h.user else '',
            'Detalles': str(h.details) if h.details else ''
        } for h in history])
        
        # Sesiones de caja
        df_cash_sessions = pd.DataFrame([{
            'ID': cs.id,
            'Fecha Apertura': cs.opened_at,
            'Fecha Cierre': cs.closed_at,
            'Usuario Apertura': cs.opened_by.username if cs.opened_by else '',
            'Usuario Cierre': cs.closed_by.username if cs.closed_by else '',
            'Importe Inicial': cs.initial_amount,
            'Esperado Final': cs.expected_final_amount or 0,
            'Real Final': cs.actual_final_amount or 0,
            'Diferencia': cs.difference or 0,
            'Estado': cs.status.value,
            'Notas': cs.notes or ''
        } for cs in cash_sessions])
        
        # Transacciones de caja
        df_cash_transactions = pd.DataFrame([{
            'ID': ct.id,
            'Sesión ID': ct.cash_session_id,
            'Fecha': ct.timestamp,
            'Tipo': ct.transaction_type.value,
            'Stay ID': ct.stay_id or '',
            'Matrícula': ct.stay.vehicle.license_plate if ct.stay else '',
            'Importe Debido': ct.amount_due,
            'Importe Pagado': ct.amount_paid or 0,
            'Cambio Dado': ct.change_given or 0,
            'Método Pago': ct.payment_method.value,
            'Usuario': ct.user.username if ct.user else '',
            'Notas': ct.notes or ''
        } for ct in cash_transactions])
        
        # ========================================================================
        # RESUMEN
        # ========================================================================
        
        total_ingresos = sum([s.final_price for s in stays if s.final_price])
        total_sinpas = sum([b.amount_owed for b in blacklist])
        
        # Métricas de caja
        total_efectivo = sum([
            ct.amount_due for ct in cash_transactions 
            if ct.transaction_type.value in ['checkout', 'prepayment'] 
            and ct.payment_method.value == 'cash'
        ])
        
        total_tarjeta = sum([
            ct.amount_due for ct in cash_transactions 
            if ct.transaction_type.value in ['checkout', 'prepayment'] 
            and ct.payment_method.value == 'card'
        ])
        
        total_retiros = sum([
            ct.amount_due for ct in cash_transactions 
            if ct.transaction_type.value == 'withdrawal'
        ])
        
        sesiones_cerradas = len([cs for cs in cash_sessions if cs.status.value == 'closed'])
        
        df_resumen = pd.DataFrame([{
            'Métrica': 'Total Vehículos',
            'Valor': len(stays)
        }, {
            'Métrica': 'Total Ingresos (€)',
            'Valor': f"{total_ingresos:.2f}"
        }, {
            'Métrica': 'Ingresos Efectivo (€)',
            'Valor': f"{total_efectivo:.2f}"
        }, {
            'Métrica': 'Ingresos Tarjeta (€)',
            'Valor': f"{total_tarjeta:.2f}"
        }, {
            'Métrica': 'Total Retiros (€)',
            'Valor': f"{total_retiros:.2f}"
        }, {
            'Métrica': 'Sesiones de Caja',
            'Valor': len(cash_sessions)
        }, {
            'Métrica': 'Sesiones Cerradas',
            'Valor': sesiones_cerradas
        }, {
            'Métrica': 'Nuevos SINPAS',
            'Valor': len(blacklist)
        }, {
            'Métrica': 'Deuda SINPAS (€)',
            'Valor': f"{total_sinpas:.2f}"
        }])
        
        # ========================================================================
        # GUARDAR EXCEL
        # ========================================================================
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df_resumen.to_excel(writer, sheet_name='Resumen', index=False)
            df_stays.to_excel(writer, sheet_name='Estancias', index=False)
            df_cash_sessions.to_excel(writer, sheet_name='Sesiones Caja', index=False)
            df_cash_transactions.to_excel(writer, sheet_name='Transacciones Caja', index=False)
            df_blacklist.to_excel(writer, sheet_name='SINPAS', index=False)
            df_history.to_excel(writer, sheet_name='Historial', index=False)
        
        print(f"✓ Excel creado: {filename}")
        print(f"  - {len(stays)} estancias")
        print(f"  - {total_ingresos:.2f}€ ingresos totales")
        print(f"  - {total_efectivo:.2f}€ efectivo")
        print(f"  - {len(cash_sessions)} sesiones de caja")
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
    print(f"Fecha: {datetime.now(ZoneInfo('Europe/Madrid')).strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Crear backup de BD
    backup_file = create_db_backup()
    
    if not backup_file:
        print("\n❌ No se pudo crear el backup")
        return 1
    
    # 2. Subir a Google Drive (SIN BORRAR NADA)
    drive = GoogleDriveService()
    if drive.authenticate():
        drive.upload_file(backup_file, drive.bd_folder_id)
        print("💾 Todos los backups se guardan en Drive permanentemente")
    
    # 3. Limpiar backups locales antiguos (solo local, Drive mantiene todos)
    cleanup_local_backups()
    
    # 4. Exportación mensual (solo el día 1)
    if datetime.now(ZoneInfo("Europe/Madrid")).day == 1:
        excel_file = export_monthly_excel()
        if excel_file and drive.service:
            drive.upload_file(excel_file, drive.excel_folder_id)
    
    print("\n" + "=" * 60)
    print("✅ BACKUP COMPLETADO")
    print("=" * 60)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())