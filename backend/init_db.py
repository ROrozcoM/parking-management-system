from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app import models
from app.crud import initialize_parking_spots, create_default_user

def init_db():
    # Create tables
    models.Base.metadata.create_all(bind=engine)
    
    # Initialize database
    db = SessionLocal()
    try:
        # Initialize parking spots
        initialize_parking_spots(db)
        
        # Create default admin user
        create_default_user(db)
        
        print("Database initialized successfully!")
        print("Default admin user: admin / extremoduro5800")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()