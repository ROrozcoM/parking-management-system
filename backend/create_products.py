"""
Script para inicializar productos por defecto
"""
import sys
sys.path.append('/app')

from app.database import SessionLocal
from app.models import Product
from sqlalchemy import func

def init_default_products():
    """Crea productos por defecto si no existen"""
    db = SessionLocal()
    
    try:
        # Verificar si ya hay productos
        existing_count = db.query(func.count(Product.id)).scalar()
        
        if existing_count == 0:
            print("📦 Creando productos por defecto...")
            
            default_products = [
                Product(name="Agua", price=3.0, is_active=True),
                Product(name="Refresco", price=3.0, is_active=True),
                Product(name="Pastillas desinfectantes", price=18.0, is_active=True)
            ]
            
            for product in default_products:
                db.add(product)
            
            db.commit()
            print(f"✅ {len(default_products)} productos creados correctamente")
        else:
            print(f"ℹ️ Ya existen {existing_count} productos en la base de datos")
    
    except Exception as e:
        print(f"❌ Error inicializando productos: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_default_products()