#!/usr/bin/env python3
"""
Script para crear los usuarios del sistema:
- 2 admins: javi, fito
- 3 workers: worker1, worker2, worker3

MODIFICADO PARA RAILWAY: No requiere interacción (sin input())
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database import SessionLocal
from app import models
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_users():
    """Crear los 5 usuarios del sistema"""
    db = SessionLocal()
    
    try:
        print("👥 Creando usuarios del sistema...")
        
        # Definir usuarios
        users = [
            {"username": "javi", "password": "extremoduro5800", "role": models.UserRole.ADMIN},
            {"username": "fito", "password": "extremoduro5800", "role": models.UserRole.ADMIN},
            {"username": "worker1", "password": "worker1", "role": models.UserRole.WORKER},
            {"username": "worker2", "password": "worker2", "role": models.UserRole.WORKER},
            {"username": "worker3", "password": "worker3", "role": models.UserRole.WORKER},
        ]
        
        for user_data in users:
            # Verificar si ya existe
            existing = db.query(models.User).filter(
                models.User.username == user_data["username"]
            ).first()
            
            if existing:
                # Actualizar rol si cambió
                if existing.role != user_data["role"]:
                    existing.role = user_data["role"]
                    print(f"  ✓ Actualizado rol de {user_data['username']}: {user_data['role'].value}")
                else:
                    print(f"  ℹ️  Usuario {user_data['username']} ya existe")
            else:
                # Crear nuevo usuario
                hashed_password = pwd_context.hash(user_data["password"])
                user = models.User(
                    username=user_data["username"],
                    hashed_password=hashed_password,
                    is_active=True,
                    role=user_data["role"]
                )
                db.add(user)
                print(f"  ✓ Creado usuario {user_data['username']} ({user_data['role'].value})")
        
        db.commit()
        
        print("\n" + "="*60)
        print("✅ USUARIOS LISTOS")
        print("="*60)
        print("\nADMINS (acceso a Analytics):")
        print("  - javi / extremoduro5800")
        print("  - fito / extremoduro5800")
        print("\nWORKERS:")
        print("  - worker1 / worker1")
        print("  - worker2 / worker2")
        print("  - worker3 / worker3")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        raise  # Re-raise para que init_db.sh detecte el error
    finally:
        db.close()

if __name__ == "__main__":
    create_users()