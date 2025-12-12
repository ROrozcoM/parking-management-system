#!/usr/bin/env python3
"""
Script para crear plazas de parking

DISTRIBUCIÓN ACTUALIZADA:
- A: 27 plazas
- B: 16 plazas
- CB: 3 plazas
- C: 20 plazas
- CPLUS: 1 plaza
TOTAL: 67 plazas
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
        
        # Nueva distribución: 67 plazas
        spots_config = [
            {"type": models.SpotType.A, "count": 27, "prefix": "A"},
            {"type": models.SpotType.B, "count": 16, "prefix": "B"},
            {"type": models.SpotType.CB, "count": 3, "prefix": "CB"},
            {"type": models.SpotType.C, "count": 20, "prefix": "C"},
            {"type": models.SpotType.CPLUS, "count": 1, "prefix": "CPLUS"},
        ]
        
        total_created = 0
        
        for config in spots_config:
            spot_type = config["type"]
            count = config["count"]
            prefix = config["prefix"]
            
            for i in range(1, count + 1):
                spot_number = f"{prefix}{i:02d}"
                
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
        print(f"  - Tipo B: 16 plazas (B01-B16)")
        print(f"  - Tipo CB: 3 plazas (CB01-CB03)")
        print(f"  - Tipo C: 20 plazas (C01-C20)")
        print(f"  - Tipo CPLUS: 1 plaza (CPLUS01)")
        print(f"\n  TOTAL: {total_created} plazas")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_parking_spots()