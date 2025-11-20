#!/usr/bin/env python3
"""
Script para crear vehículos pendientes de prueba.

Uso:
    docker-compose exec backend python3 create_pending_test.py
"""

import sys
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Añadir el directorio app al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database import SessionLocal
from app import models

def create_pending_vehicles():
    """
    Crea 3 vehículos pendientes de prueba.
    """
    db = SessionLocal()
    
    try:
        print("🚗 Creando vehículos pendientes de prueba...")
        
        # Datos de vehículos de prueba
        test_vehicles = [
            {"plate": "TEST004", "type": "Caravan", "brand": "Hobby", "country": "Spain"},
            {"plate": "TEST005", "type": "Motorhome", "brand": "Fiat", "country": "France"},
            {"plate": "TEST006", "type": "Camper", "brand": "VW", "country": "Poland"},
        ]
        
        for v_data in test_vehicles:
            # Verificar si el vehículo ya existe
            existing_vehicle = db.query(models.Vehicle).filter(
                models.Vehicle.license_plate == v_data["plate"]
            ).first()
            
            if not existing_vehicle:
                # Crear vehículo
                vehicle = models.Vehicle(
                    license_plate=v_data["plate"],
                    vehicle_type=v_data["type"],
                    brand=v_data["brand"],
                    country=v_data["country"],
                    is_blacklisted=False
                )
                db.add(vehicle)
                db.flush()  # Para obtener el ID
            else:
                vehicle = existing_vehicle
            
            # Verificar si ya tiene una estancia pendiente
            existing_stay = db.query(models.Stay).filter(
                models.Stay.vehicle_id == vehicle.id,
                models.Stay.status == models.StayStatus.PENDING
            ).first()
            
            if not existing_stay:
                # Crear estancia pendiente
                stay = models.Stay(
                    vehicle_id=vehicle.id,
                    status=models.StayStatus.PENDING,
                    detection_time=datetime.now(ZoneInfo("Europe/Madrid")) - timedelta(minutes=5),
                    payment_status=models.PaymentStatus.PENDING
                )
                db.add(stay)
                print(f"✓ Creado vehículo pendiente: {v_data['plate']}")
            else:
                print(f"⚠️  {v_data['plate']} ya tiene una estancia pendiente")
        
        db.commit()
        
        print("\n✅ Vehículos pendientes creados correctamente!")
        print("\nAhora deberías ver 3 vehículos en 'Pending Stays':")
        print("  - TEST001 (Caravan)")
        print("  - TEST002 (Motorhome)")
        print("  - TEST003 (Camper)")
        print("\nPuedes probar a:")
        print("  1. Hacer check-in normal")
        print("  2. Marcar uno como SINPA")
        print("  3. Intentar hacer check-in del que marcaste como SINPA")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_pending_vehicles()