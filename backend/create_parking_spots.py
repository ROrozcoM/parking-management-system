#!/usr/bin/env python3
"""
Script para crear plazas de parking

MODIFICADO PARA RAILWAY: No requiere interacción (sin input())
- Detecta si ya existen plazas
- No las duplica si ya están creadas
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database import SessionLocal
from app import models

def create_parking_spots():
    """Crear plazas de parking"""
    db = SessionLocal()
    
    try:
        print("🅿️  Creando plazas de parking...")
        
        # Verificar si ya existen plazas
        existing = db.query(models.ParkingSpot).count()
        if existing > 0:
            print(f"  ℹ️  Ya existen {existing} plazas. No se crearán duplicados.")
            return
        
        # Definir plazas a crear (configuración actual del parking)
        spots_config = [
            {"type": models.SpotType.A, "count": 27},  # 27 plazas tipo A
            {"type": models.SpotType.B, "count": 19},  # 19 plazas tipo B
            {"type": models.SpotType.C, "count": 20},  # 20 plazas tipo C
            {"type": models.SpotType.SPECIAL, "count": 2},  # 2 plazas especiales
        ]
        
        total_created = 0
        
        for config in spots_config:
            spot_type = config["type"]
            count = config["count"]
            
            for i in range(1, count + 1):
                spot_number = f"{spot_type.value}{i:02d}"
                
                spot = models.ParkingSpot(
                    spot_number=spot_number,
                    spot_type=spot_type,
                    is_occupied=False
                )
                db.add(spot)
                total_created += 1
                print(f"  ✓ Creada plaza: {spot_number}")
        
        db.commit()
        
        print("\n" + "="*60)
        print(f"✅ {total_created} PLAZAS CREADAS")
        print("="*60)
        print("\nDistribución:")
        print(f"  - Tipo A: 27 plazas (A01-A27)")
        print(f"  - Tipo B: 19 plazas (B01-B19)")
        print(f"  - Tipo C: 20 plazas (C01-C20)")
        print(f"  - Especiales: 2 plazas (Special01-Special02)")
        print(f"\n  TOTAL: {total_created} plazas")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        raise  # Re-raise para que init_db.sh detecte el error
    finally:
        db.close()

if __name__ == "__main__":
    create_parking_spots()