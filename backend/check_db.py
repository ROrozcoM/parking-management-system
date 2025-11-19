#!/usr/bin/env python3
"""
Script para verificar que la base de datos está correctamente inicializada
Útil para troubleshooting en Railway
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database import SessionLocal
from app.models import User, ParkingSpot, Vehicle, Stay

def check_database():
    """Verificar estado de la base de datos"""
    db = SessionLocal()
    
    try:
        print("="*60)
        print("🔍 VERIFICACIÓN DE BASE DE DATOS")
        print("="*60)
        
        # Contar usuarios
        users_count = db.query(User).count()
        admins_count = db.query(User).filter(User.role == 'admin').count()
        workers_count = db.query(User).filter(User.role == 'worker').count()
        
        print(f"\n👥 USUARIOS:")
        print(f"  Total: {users_count}")
        print(f"  Admins: {admins_count}")
        print(f"  Workers: {workers_count}")
        
        if users_count >= 5:
            print("  ✅ Usuarios correctamente inicializados")
        else:
            print("  ⚠️  Faltan usuarios (esperados: 5)")
        
        # Listar usuarios
        users = db.query(User).all()
        for user in users:
            print(f"    - {user.username} ({user.role})")
        
        # Contar plazas
        spots_count = db.query(ParkingSpot).count()
        spots_a = db.query(ParkingSpot).filter(ParkingSpot.spot_type == 'A').count()
        spots_b = db.query(ParkingSpot).filter(ParkingSpot.spot_type == 'B').count()
        spots_c = db.query(ParkingSpot).filter(ParkingSpot.spot_type == 'C').count()
        spots_special = db.query(ParkingSpot).filter(ParkingSpot.spot_type == 'Special').count()
        occupied = db.query(ParkingSpot).filter(ParkingSpot.is_occupied == True).count()
        
        print(f"\n🅿️  PLAZAS DE PARKING:")
        print(f"  Total: {spots_count}")
        print(f"  Tipo A: {spots_a}")
        print(f"  Tipo B: {spots_b}")
        print(f"  Tipo C: {spots_c}")
        print(f"  Especiales: {spots_special}")
        print(f"  Ocupadas: {occupied}")
        print(f"  Disponibles: {spots_count - occupied}")
        
        if spots_count >= 60:  # Al menos 60 plazas
            print("  ✅ Plazas correctamente inicializadas")
        else:
            print("  ⚠️  Faltan plazas (esperadas: ~68)")
        
        # Contar otros registros
        vehicles_count = db.query(Vehicle).count()
        stays_count = db.query(Stay).count()
        
        print(f"\n📊 DATOS OPERACIONALES:")
        print(f"  Vehículos registrados: {vehicles_count}")
        print(f"  Estancias totales: {stays_count}")
        
        # Resumen final
        print("\n" + "="*60)
        if users_count >= 5 and spots_count >= 60:
            print("✅ BASE DE DATOS CORRECTAMENTE INICIALIZADA")
        else:
            print("⚠️  BASE DE DATOS INCOMPLETA - EJECUTAR SCRIPTS DE INICIALIZACIÓN")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error al verificar base de datos: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_database()
