#!/usr/bin/env python3
"""
Exportar TODA la base de datos a archivos CSV
Uso:
    docker-compose exec backend python3 export_db_to_csv.py
    
Los archivos se guardarán en /app/backups/csv/FECHA/
"""

import sys
import os
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

# Add app to path
sys.path.insert(0, '/app')
from app.database import SessionLocal
from app import models

# Configuración
# Si estamos en el contenedor, usar /app/backups
# Si estamos fuera, usar backend/backups
if Path("/app").exists():
    BACKUP_DIR = Path("/app/backups")
else:
    BACKUP_DIR = Path(__file__).parent / "backups"

BACKUP_DIR.mkdir(exist_ok=True)
CSV_DIR = BACKUP_DIR / "csv"
CSV_DIR.mkdir(exist_ok=True)

def export_to_csv():
    """Exportar todas las tablas a CSV"""
    
    try:
        import pandas as pd
    except ImportError:
        print("❌ Instala pandas: pip install pandas")
        return False
    
    # Crear carpeta con timestamp
    timestamp = datetime.now(ZoneInfo("Europe/Madrid")).strftime("%Y%m%d_%H%M%S")
    export_dir = CSV_DIR / f"export_{timestamp}"
    export_dir.mkdir(exist_ok=True)
    
    print("=" * 70)
    print("📤 EXPORTANDO BASE DE DATOS A CSV")
    print("=" * 70)
    print(f"Directorio: {export_dir}")
    print()
    
    db = SessionLocal()
    
    try:
        # ====================================================================
        # USUARIOS
        # ====================================================================
        print("📋 Exportando usuarios...")
        users = db.query(models.User).all()
        df_users = pd.DataFrame([{
            'id': u.id,
            'username': u.username,
            'is_active': u.is_active,
            'role': u.role.value
        } for u in users])
        df_users.to_csv(export_dir / "users.csv", index=False, encoding='utf-8-sig')
        print(f"   ✓ {len(users)} usuarios exportados")
        
        # ====================================================================
        # VEHÍCULOS
        # ====================================================================
        print("📋 Exportando vehículos...")
        vehicles = db.query(models.Vehicle).all()
        df_vehicles = pd.DataFrame([{
            'id': v.id,
            'license_plate': v.license_plate,
            'vehicle_type': v.vehicle_type,
            'brand': v.brand or '',
            'country': v.country or '',
            'is_blacklisted': v.is_blacklisted
        } for v in vehicles])
        df_vehicles.to_csv(export_dir / "vehicles.csv", index=False, encoding='utf-8-sig')
        print(f"   ✓ {len(vehicles)} vehículos exportados")
        
        # ====================================================================
        # PLAZAS DE PARKING
        # ====================================================================
        print("📋 Exportando plazas de parking...")
        spots = db.query(models.ParkingSpot).all()
        df_spots = pd.DataFrame([{
            'id': s.id,
            'spot_number': s.spot_number,
            'spot_type': s.spot_type.value,
            'is_occupied': s.is_occupied
        } for s in spots])
        df_spots.to_csv(export_dir / "parking_spots.csv", index=False, encoding='utf-8-sig')
        print(f"   ✓ {len(spots)} plazas exportadas")
        
        # ====================================================================
        # ESTANCIAS
        # ====================================================================
        print("📋 Exportando estancias...")
        stays = db.query(models.Stay).all()
        df_stays = pd.DataFrame([{
            'id': s.id,
            'vehicle_id': s.vehicle_id,
            'license_plate': s.vehicle.license_plate,
            'parking_spot_id': s.parking_spot_id,
            'spot_number': s.parking_spot.spot_number if s.parking_spot else '',
            'detection_time': s.detection_time,
            'check_in_time': s.check_in_time,
            'check_out_time': s.check_out_time,
            'status': s.status.value,
            'final_price': s.final_price or 0,
            'payment_status': s.payment_status.value,
            'payment_method': s.payment_method.value if s.payment_method else '',
            'amount_paid': s.amount_paid or 0,
            'change_given': s.change_given or 0,
            'prepaid_amount': s.prepaid_amount or 0,
            'cash_registered': s.cash_registered,
            'prepayment_cash_registered': s.prepayment_cash_registered,
            'user_id': s.user_id
        } for s in stays])
        df_stays.to_csv(export_dir / "stays.csv", index=False, encoding='utf-8-sig')
        print(f"   ✓ {len(stays)} estancias exportadas")
        
        # ====================================================================
        # HISTORIAL
        # ====================================================================
        print("📋 Exportando historial...")
        history = db.query(models.HistoryLog).all()
        df_history = pd.DataFrame([{
            'id': h.id,
            'stay_id': h.stay_id,
            'action': h.action,
            'timestamp': h.timestamp,
            'details': str(h.details) if h.details else '',
            'user_id': h.user_id,
            'username': h.user.username if h.user else ''
        } for h in history])
        df_history.to_csv(export_dir / "history_logs.csv", index=False, encoding='utf-8-sig')
        print(f"   ✓ {len(history)} registros de historial exportados")
        
        # ====================================================================
        # LISTA NEGRA
        # ====================================================================
        print("📋 Exportando lista negra...")
        blacklist = db.query(models.Blacklist).all()
        df_blacklist = pd.DataFrame([{
            'id': b.id,
            'vehicle_id': b.vehicle_id,
            'license_plate': b.license_plate,
            'reason': b.reason,
            'amount_owed': b.amount_owed,
            'incident_date': b.incident_date,
            'stay_id': b.stay_id,
            'notes': b.notes or '',
            'resolved': b.resolved
        } for b in blacklist])
        df_blacklist.to_csv(export_dir / "blacklist.csv", index=False, encoding='utf-8-sig')
        print(f"   ✓ {len(blacklist)} entradas de lista negra exportadas")
        
        # ====================================================================
        # SESIONES DE CAJA
        # ====================================================================
        print("📋 Exportando sesiones de caja...")
        cash_sessions = db.query(models.CashSession).all()
        df_cash_sessions = pd.DataFrame([{
            'id': cs.id,
            'opened_at': cs.opened_at,
            'closed_at': cs.closed_at,
            'opened_by_user_id': cs.opened_by_user_id,
            'opened_by_username': cs.opened_by.username if cs.opened_by else '',
            'closed_by_user_id': cs.closed_by_user_id,
            'closed_by_username': cs.closed_by.username if cs.closed_by else '',
            'initial_amount': cs.initial_amount,
            'expected_final_amount': cs.expected_final_amount or 0,
            'actual_final_amount': cs.actual_final_amount or 0,
            'difference': cs.difference or 0,
            'status': cs.status.value,
            'notes': cs.notes or ''
        } for cs in cash_sessions])
        df_cash_sessions.to_csv(export_dir / "cash_sessions.csv", index=False, encoding='utf-8-sig')
        print(f"   ✓ {len(cash_sessions)} sesiones de caja exportadas")
        
        # ====================================================================
        # TRANSACCIONES DE CAJA
        # ====================================================================
        print("📋 Exportando transacciones de caja...")
        cash_transactions = db.query(models.CashTransaction).all()
        df_cash_transactions = pd.DataFrame([{
            'id': ct.id,
            'cash_session_id': ct.cash_session_id,
            'timestamp': ct.timestamp,
            'transaction_type': ct.transaction_type.value,
            'stay_id': ct.stay_id or '',
            'license_plate': ct.stay.vehicle.license_plate if ct.stay else '',
            'amount_due': ct.amount_due,
            'amount_paid': ct.amount_paid or 0,
            'change_given': ct.change_given or 0,
            'payment_method': ct.payment_method.value,
            'user_id': ct.user_id,
            'username': ct.user.username if ct.user else '',
            'notes': ct.notes or ''
        } for ct in cash_transactions])
        df_cash_transactions.to_csv(export_dir / "cash_transactions.csv", index=False, encoding='utf-8-sig')
        print(f"   ✓ {len(cash_transactions)} transacciones de caja exportadas")
        
        # ====================================================================
        # RESUMEN
        # ====================================================================
        print("\n" + "=" * 70)
        print("✅ EXPORTACIÓN COMPLETADA")
        print("=" * 70)
        print(f"\nArchivos guardados en: {export_dir}")
        print("\nArchivos creados:")
        for csv_file in sorted(export_dir.glob("*.csv")):
            size_kb = csv_file.stat().st_size / 1024
            print(f"  - {csv_file.name:<30} ({size_kb:>8.2f} KB)")
        
        print("\n💡 Para ver los archivos:")
        print(f"   Los archivos están en: backend/backups/csv/export_{timestamp}/")
        print("\n   O desde Docker:")
        print(f"   docker-compose exec backend ls -lh /app/backups/csv/export_{timestamp}/")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error exportando: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = export_to_csv()
    sys.exit(0 if success else 1)