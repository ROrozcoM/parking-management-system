# Caravan Parking Management App - Implementation Plan

## 1. Backend Implementation (FastAPI)

### 1.1. Project Structure and Dependencies

#### Directory Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app setup, CORS middleware
│   ├── database.py          # SQLAlchemy connection and session
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── crud.py              # Business logic
│   ├── dependencies.py      # JWT authentication
│   └── api/
│       ├── __init__.py
│       ├── auth.py          # Authentication endpoints
│       ├── stays.py         # Stay management endpoints
│       ├── dashboard.py     # Dashboard data endpoint
│       └── history.py       # History log endpoint
├── requirements.txt         # Python dependencies
└── Dockerfile               # Backend Docker image
```

#### Dependencies (requirements.txt)
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pydantic==2.5.0
pydantic-settings==2.1.0
alembic==1.13.1
python-dotenv==1.0.0
```

### 1.2. Database Models (models.py)

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class SpotType(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    SPECIAL = "Special"

class StayStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    DISCARDED = "discarded"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    stays = relationship("Stay", back_populates="user")
    history_logs = relationship("HistoryLog", back_populates="user")

class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(Integer, primary_key=True, index=True)
    license_plate = Column(String, unique=True, index=True)
    vehicle_type = Column(String)
    brand = Column(String, nullable=True)
    country = Column(String, nullable=True)
    is_blacklisted = Column(Boolean, default=False)
    
    # Relationships
    stays = relationship("Stay", back_populates="vehicle")

class ParkingSpot(Base):
    __tablename__ = "parking_spots"
    
    id = Column(Integer, primary_key=True, index=True)
    spot_number = Column(String, unique=True)
    spot_type = Column(Enum(SpotType))
    is_occupied = Column(Boolean, default=False)
    
    # Relationships
    stays = relationship("Stay", back_populates="parking_spot")

class Stay(Base):
    __tablename__ = "stays"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    parking_spot_id = Column(Integer, ForeignKey("parking_spots.id"), nullable=True)
    detection_time = Column(DateTime, default=func.now())
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    status = Column(Enum(StayStatus), default=StayStatus.PENDING)
    final_price = Column(Float, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="stays")
    parking_spot = relationship("ParkingSpot", back_populates="stays")
    user = relationship("User", back_populates="stays")
    history_logs = relationship("HistoryLog", back_populates="stay")

class HistoryLog(Base):
    __tablename__ = "history_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    stay_id = Column(Integer, ForeignKey("stays.id"))
    action = Column(String)
    timestamp = Column(DateTime, default=func.now())
    details = Column(JSON, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    stay = relationship("Stay", back_populates="history_logs")
    user = relationship("User", back_populates="history_logs")
```

### 1.3. Database Configuration (database.py)

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

SQLALCHEMY_DATABASE_URL = f"postgresql://{settings.database_username}:{settings.database_password}@{settings.database_hostname}:{settings.database_port}/{settings.database_name}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 1.4. Pydantic Schemas (schemas.py)

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class SpotType(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    SPECIAL = "Special"

class StayStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    DISCARDED = "discarded"

# User schemas
class UserBase(BaseModel):
    username: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True

# Vehicle schemas
class VehicleBase(BaseModel):
    license_plate: str
    vehicle_type: str
    brand: Optional[str] = None
    country: Optional[str] = None
    is_blacklisted: bool = False

class VehicleCreate(VehicleBase):
    pass

class Vehicle(VehicleBase):
    id: int
    
    class Config:
        from_attributes = True

# ParkingSpot schemas
class ParkingSpotBase(BaseModel):
    spot_number: str
    spot_type: SpotType
    is_occupied: bool = False

class ParkingSpotCreate(ParkingSpotBase):
    pass

class ParkingSpot(ParkingSpotBase):
    id: int
    
    class Config:
        from_attributes = True

# Stay schemas
class StayBase(BaseModel):
    vehicle_id: int
    status: StayStatus = StayStatus.PENDING
    final_price: Optional[float] = None

class StayCreate(StayBase):
    license_plate: str
    vehicle_type: str

class StayUpdate(BaseModel):
    parking_spot_id: Optional[int] = None
    status: Optional[StayStatus] = None
    final_price: Optional[float] = None

class Stay(StayBase):
    id: int
    detection_time: datetime
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    user_id: Optional[int] = None
    vehicle: Vehicle
    parking_spot: Optional[ParkingSpot] = None
    
    class Config:
        from_attributes = True

# HistoryLog schemas
class HistoryLogBase(BaseModel):
    stay_id: int
    action: str
    details: Optional[dict] = None

class HistoryLogCreate(HistoryLogBase):
    pass

class HistoryLog(HistoryLogBase):
    id: int
    timestamp: datetime
    user_id: int
    
    class Config:
        from_attributes = True

# Token schema
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Dashboard schema
class DashboardData(BaseModel):
    pending_stays: List[Stay]
    active_stays: List[Stay]
    total_spots: int
    occupied_spots: int
    available_spots: int
```

### 1.5. CRUD Functions (crud.py)

```python
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app import models, schemas
from typing import List, Optional
from datetime import datetime

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_vehicle_by_license_plate(db: Session, license_plate: str):
    return db.query(models.Vehicle).filter(models.Vehicle.license_plate == license_plate).first()

def create_vehicle(db: Session, vehicle: schemas.VehicleCreate):
    db_vehicle = models.Vehicle(**vehicle.dict())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def get_pending_stays(db: Session):
    return db.query(models.Stay).filter(models.Stay.status == models.StayStatus.PENDING).all()

def get_active_stays(db: Session):
    return db.query(models.Stay).filter(models.Stay.status == models.StayStatus.ACTIVE).all()

def get_stay(db: Session, stay_id: int):
    return db.query(models.Stay).filter(models.Stay.id == stay_id).first()

def create_stay(db: Session, stay: schemas.StayCreate, user_id: Optional[int] = None):
    # Check if vehicle exists, create if not
    vehicle = get_vehicle_by_license_plate(db, stay.license_plate)
    if not vehicle:
        vehicle_data = {
            "license_plate": stay.license_plate,
            "vehicle_type": stay.vehicle_type
        }
        vehicle = create_vehicle(db, schemas.VehicleCreate(**vehicle_data))
    
    # Create stay
    db_stay = models.Stay(
        vehicle_id=vehicle.id,
        status=stay.status,
        user_id=user_id
    )
    db.add(db_stay)
    db.commit()
    db.refresh(db_stay)
    return db_stay

def check_in_stay(db: Session, stay_id: int, spot_type: models.SpotType, user_id: int):
    stay = get_stay(db, stay_id)
    if not stay:
        return None
    
    # Find an available parking spot of the specified type
    spot = db.query(models.ParkingSpot).filter(
        and_(
            models.ParkingSpot.spot_type == spot_type,
            models.ParkingSpot.is_occupied == False
        )
    ).first()
    
    if not spot:
        return None
    
    # Update stay
    stay.parking_spot_id = spot.id
    stay.status = models.StayStatus.ACTIVE
    stay.check_in_time = stay.detection_time  # Set check_in_time to detection_time
    stay.user_id = user_id
    
    # Update spot
    spot.is_occupied = True
    
    # Create history log
    log_details = {
        "spot_type": spot_type.value,
        "spot_number": spot.spot_number
    }
    create_history_log(db, schemas.HistoryLogCreate(
        stay_id=stay_id,
        action="Check-in performed",
        details=log_details
    ), user_id)
    
    db.commit()
    db.refresh(stay)
    return stay

def check_out_stay(db: Session, stay_id: int, final_price: float, user_id: int):
    stay = get_stay(db, stay_id)
    if not stay:
        return None
    
    # Update stay
    stay.status = models.StayStatus.COMPLETED
    stay.check_out_time = datetime.now()
    stay.final_price = final_price
    
    # Free up parking spot
    if stay.parking_spot:
        spot = db.query(models.ParkingSpot).filter(models.ParkingSpot.id == stay.parking_spot_id).first()
        if spot:
            spot.is_occupied = False
    
    # Create history log
    log_details = {
        "final_price": final_price,
        "spot_number": stay.parking_spot.spot_number if stay.parking_spot else None
    }
    create_history_log(db, schemas.HistoryLogCreate(
        stay_id=stay_id,
        action="Check-out performed",
        details=log_details
    ), user_id)
    
    db.commit()
    db.refresh(stay)
    return stay

def discard_stay(db: Session, stay_id: int, reason: str, user_id: int):
    stay = get_stay(db, stay_id)
    if not stay:
        return None
    
    # Update stay
    stay.status = models.StayStatus.DISCARDED
    
    # If reason is 'sedan', blacklist the vehicle
    if reason.lower() == 'sedan':
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == stay.vehicle_id).first()
        if vehicle:
            vehicle.is_blacklisted = True
    
    # Create history log
    log_details = {
        "reason": reason,
        "vehicle_blacklisted": reason.lower() == 'sedan'
    }
    create_history_log(db, schemas.HistoryLogCreate(
        stay_id=stay_id,
        action="Stay discarded",
        details=log_details
    ), user_id)
    
    db.commit()
    db.refresh(stay)
    return stay

def create_manual_stay(db: Session, stay_data: dict, user_id: int):
    # Check if vehicle exists, create if not
    vehicle = get_vehicle_by_license_plate(db, stay_data["license_plate"])
    if not vehicle:
        vehicle_data = {
            "license_plate": stay_data["license_plate"],
            "vehicle_type": stay_data["vehicle_type"]
        }
        vehicle = create_vehicle(db, schemas.VehicleCreate(**vehicle_data))
    
    # Find an available parking spot of the specified type
    spot = db.query(models.ParkingSpot).filter(
        and_(
            models.ParkingSpot.spot_type == stay_data["spot_type"],
            models.ParkingSpot.is_occupied == False
        )
    ).first()
    
    if not spot:
        return None
    
    # Create stay with active status
    db_stay = models.Stay(
        vehicle_id=vehicle.id,
        parking_spot_id=spot.id,
        status=models.StayStatus.ACTIVE,
        check_in_time=datetime.now(),
        detection_time=datetime.now(),  # Manual entry, so detection time is now
        user_id=user_id
    )
    
    # Update spot
    spot.is_occupied = True
    
    db.add(db_stay)
    db.commit()
    db.refresh(db_stay)
    
    # Create history log
    log_details = {
        "spot_type": stay_data["spot_type"].value if isinstance(stay_data["spot_type"], models.SpotType) else stay_data["spot_type"],
        "spot_number": spot.spot_number,
        "manual_entry": True
    }
    create_history_log(db, schemas.HistoryLogCreate(
        stay_id=db_stay.id,
        action="Manual entry created",
        details=log_details
    ), user_id)
    
    return db_stay

def create_history_log(db: Session, log: schemas.HistoryLogCreate, user_id: int):
    db_log = models.HistoryLog(
        stay_id=log.stay_id,
        action=log.action,
        details=log.details,
        user_id=user_id
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_history_logs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.HistoryLog).offset(skip).limit(limit).all()

def get_dashboard_data(db: Session):
    pending_stays = get_pending_stays(db)
    active_stays = get_active_stays(db)
    
    total_spots = db.query(models.ParkingSpot).count()
    occupied_spots = db.query(models.ParkingSpot).filter(models.ParkingSpot.is_occupied == True).count()
    available_spots = total_spots - occupied_spots
    
    return {
        "pending_stays": pending_stays,
        "active_stays": active_stays,
        "total_spots": total_spots,
        "occupied_spots": occupied_spots,
        "available_spots": available_spots
    }
```

### 1.6. Authentication (dependencies.py)

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from passlib.context import CryptContext

# Secret key for JWT
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
```

### 1.7. API Endpoints

#### Authentication (api/auth.py)

```python
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.dependencies import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user
```

#### Stays Management (api/stays.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user
from app.crud import (
    get_pending_stays,
    get_active_stays,
    get_stay,
    check_in_stay,
    check_out_stay,
    discard_stay,
    create_manual_stay
)

router = APIRouter(prefix="/stays", tags=["stays"])

@router.get("/pending", response_model=List[schemas.Stay])
async def list_pending_stays(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return get_pending_stays(db)

@router.get("/active", response_model=List[schemas.Stay])
async def list_active_stays(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return get_active_stays(db)

@router.post("/{stay_id}/check-in", response_model=schemas.Stay)
async def check_in(
    stay_id: int,
    spot_type: models.SpotType,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    stay = check_in_stay(db, stay_id, spot_type, current_user.id)
    if not stay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stay not found or no available spots of the specified type"
        )
    return stay

@router.post("/{stay_id}/check-out", response_model=schemas.Stay)
async def check_out(
    stay_id: int,
    final_price: float,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    stay = check_out_stay(db, stay_id, final_price, current_user.id)
    if not stay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stay not found"
        )
    return stay

@router.post("/{stay_id}/discard", response_model=schemas.Stay)
async def discard(
    stay_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    stay = discard_stay(db, stay_id, reason, current_user.id)
    if not stay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stay not found"
        )
    return stay

@router.post("/manual", response_model=schemas.Stay)
async def create_manual_entry(
    license_plate: str,
    vehicle_type: str,
    spot_type: models.SpotType,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    stay_data = {
        "license_plate": license_plate,
        "vehicle_type": vehicle_type,
        "spot_type": spot_type
    }
    stay = create_manual_stay(db, stay_data, current_user.id)
    if not stay:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create manual entry - no available spots of the specified type"
        )
    return stay
```

#### Dashboard (api/dashboard.py)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user
from app.crud import get_dashboard_data

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/data", response_model=schemas.DashboardData)
async def dashboard_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return get_dashboard_data(db)
```

#### History (api/history.py)

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user
from app.crud import get_history_logs

router = APIRouter(prefix="/history", tags=["history"])

@router.get("/", response_model=List[schemas.HistoryLog])
async def history_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return get_history_logs(db, skip=skip, limit=limit)
```

### 1.8. Main Application (main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app import models
from app.api import auth, stays, dashboard, history

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Caravan Parking Management API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(stays.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(history.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Caravan Parking Management API"}
```

## 2. Frontend Implementation (React)

### 2.1. Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Header.js       # Navigation header
│   │   ├── Footer.js       # Page footer
│   │   ├── PendingCard.js  # Pending stays card
│   │   ├── ActiveCard.js   # Active stays card
│   │   ├── CheckInModal.js # Modal for check-in
│   │   ├── CheckOutModal.js # Modal for check-out
│   │   ├── DiscardModal.js # Modal for discard
│   │   └── ManualEntryModal.js # Modal for manual entry
│   ├── pages/
│   │   ├── Login.js         # Authentication form
│   │   ├── Dashboard.js     # Main dashboard
│   │   └── History.js       # History log table
│   ├── services/
│   │   └── api.js           # Axios configuration
│   ├── contexts/
│   │   └── AuthContext.js   # Authentication context
│   ├── App.js               # Main React component
│   └── index.js             # React entry point
├── package.json             # Dependencies
└── Dockerfile               # Frontend Docker image
```

### 2.2. Dependencies (package.json)

```json
{
  "name": "parking-manager-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "react-scripts": "5.0.1",
    "axios": "^1.3.0",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:8000"
}
```

### 2.3. API Service (services/api.js)

```javascript
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/auth/token', formData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/users/me');
    return response.data;
  },
};

// Stays API
export const staysAPI = {
  getPendingStays: async () => {
    const response = await api.get('/stays/pending');
    return response.data;
  },
  
  getActiveStays: async () => {
    const response = await api.get('/stays/active');
    return response.data;
  },
  
  checkIn: async (stayId, spotType) => {
    const response = await api.post(`/stays/${stayId}/check-in`, null, {
      params: { spot_type: spotType }
    });
    return response.data;
  },
  
  checkOut: async (stayId, finalPrice) => {
    const response = await api.post(`/stays/${stayId}/check-out`, null, {
      params: { final_price: finalPrice }
    });
    return response.data;
  },
  
  discard: async (stayId, reason) => {
    const response = await api.post(`/stays/${stayId}/discard`, null, {
      params: { reason }
    });
    return response.data;
  },
  
  createManualEntry: async (licensePlate, vehicleType, spotType) => {
    const response = await api.post('/stays/manual', null, {
      params: {
        license_plate: licensePlate,
        vehicle_type: vehicleType,
        spot_type: spotType
      }
    });
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getData: async () => {
    const response = await api.get('/dashboard/data');
    return response.data;
  },
};

// History API
export const historyAPI = {
  getLogs: async (skip = 0, limit = 100) => {
    const response = await api.get('/history', {
      params: { skip, limit }
    });
    return response.data;
  },
};

export default api;
```

### 2.4. Authentication Context (contexts/AuthContext.js)

```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get current user
      authAPI.getCurrentUser()
        .then(user => {
          setCurrentUser(user);
        })
        .catch(error => {
          console.error('Failed to get current user:', error);
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      const { access_token } = response;
      
      localStorage.setItem('token', access_token);
      
      // Get current user data
      const user = await authAPI.getCurrentUser();
      setCurrentUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
```

### 2.5. Components

#### Header (components/Header.js)

```javascript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            Parking Manager
          </Link>
          
          <nav className="nav">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/history" className="nav-link">History</Link>
          </nav>
          
          <div className="user-info">
            {currentUser ? (
              <>
                <span className="username">Welcome, {currentUser.username}</span>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="login-btn">Login</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
```

#### Footer (components/Footer.js)

```javascript
import React from 'react';

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} Caravan Parking Management System</p>
      </div>
    </footer>
  );
}

export default Footer;
```

#### Pending Card (components/PendingCard.js)

```javascript
import React, { useState, useEffect } from 'react';
import { staysAPI } from '../services/api';
import CheckInModal from './CheckInModal';
import DiscardModal from './DiscardModal';

function PendingCard() {
  const [pendingStays, setPendingStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStay, setSelectedStay] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  useEffect(() => {
    fetchPendingStays();
  }, []);

  const fetchPendingStays = async () => {
    try {
      setLoading(true);
      const data = await staysAPI.getPendingStays();
      setPendingStays(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch pending stays');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInClick = (stay) => {
    setSelectedStay(stay);
    setShowCheckInModal(true);
  };

  const handleDiscardClick = (stay) => {
    setSelectedStay(stay);
    setShowDiscardModal(true);
  };

  const handleCheckInSuccess = () => {
    setShowCheckInModal(false);
    setSelectedStay(null);
    fetchPendingStays();
  };

  const handleDiscardSuccess = () => {
    setShowDiscardModal(false);
    setSelectedStay(null);
    fetchPendingStays();
  };

  if (loading) return <div className="loading">Loading pending stays...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Pending Stays</h2>
      </div>
      <div className="card-body">
        {pendingStays.length === 0 ? (
          <p>No pending stays</p>
        ) : (
          <div className="stay-list">
            {pendingStays.map(stay => (
              <div key={stay.id} className="stay-item">
                <div className="stay-info">
                  <div className="license-plate">{stay.vehicle.license_plate}</div>
                  <div className="vehicle-type">{stay.vehicle.vehicle_type}</div>
                  <div className="detection-time">
                    {new Date(stay.detection_time).toLocaleString()}
                  </div>
                </div>
                <div className="stay-actions">
                  <button 
                    className="btn btn-check-in"
                    onClick={() => handleCheckInClick(stay)}
                  >
                    Check-in
                  </button>
                  <button 
                    className="btn btn-discard"
                    onClick={() => handleDiscardClick(stay)}
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {selectedStay && (
        <>
          <CheckInModal
            show={showCheckInModal}
            onHide={() => setShowCheckInModal(false)}
            stay={selectedStay}
            onSuccess={handleCheckInSuccess}
          />
          <DiscardModal
            show={showDiscardModal}
            onHide={() => setShowDiscardModal(false)}
            stay={selectedStay}
            onSuccess={handleDiscardSuccess}
          />
        </>
      )}
    </div>
  );
}

export default PendingCard;
```

#### Active Card (components/ActiveCard.js)

```javascript
import React, { useState, useEffect } from 'react';
import { staysAPI } from '../services/api';
import CheckOutModal from './CheckOutModal';
import ManualEntryModal from './ManualEntryModal';

function ActiveCard() {
  const [activeStays, setActiveStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStay, setSelectedStay] = useState(null);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);

  useEffect(() => {
    fetchActiveStays();
  }, []);

  const fetchActiveStays = async () => {
    try {
      setLoading(true);
      const data = await staysAPI.getActiveStays();
      setActiveStays(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch active stays');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOutClick = (stay) => {
    setSelectedStay(stay);
    setShowCheckOutModal(true);
  };

  const handleAddManualEntryClick = () => {
    setShowManualEntryModal(true);
  };

  const handleCheckOutSuccess = () => {
    setShowCheckOutModal(false);
    setSelectedStay(null);
    fetchActiveStays();
  };

  const handleManualEntrySuccess = () => {
    setShowManualEntryModal(false);
    fetchActiveStays();
  };

  if (loading) return <div className="loading">Loading active stays...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Active Stays</h2>
        <button 
          className="btn btn-primary"
          onClick={handleAddManualEntryClick}
        >
          Add Manual Entry
        </button>
      </div>
      <div className="card-body">
        {activeStays.length === 0 ? (
          <p>No active stays</p>
        ) : (
          <div className="stay-list">
            {activeStays.map(stay => (
              <div key={stay.id} className="stay-item">
                <div className="stay-info">
                  <div className="license-plate">{stay.vehicle.license_plate}</div>
                  <div className="vehicle-type">{stay.vehicle.vehicle_type}</div>
                  <div className="spot-info">
                    {stay.parking_spot ? `${stay.parking_spot.spot_type} - ${stay.parking_spot.spot_number}` : 'No spot assigned'}
                  </div>
                  <div className="check-in-time">
                    {new Date(stay.check_in_time).toLocaleString()}
                  </div>
                </div>
                <div className="stay-actions">
                  <button 
                    className="btn btn-check-out"
                    onClick={() => handleCheckOutClick(stay)}
                  >
                    Check-out
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {selectedStay && (
        <CheckOutModal
          show={showCheckOutModal}
          onHide={() => setShowCheckOutModal(false)}
          stay={selectedStay}
          onSuccess={handleCheckOutSuccess}
        />
      )}
      
      <ManualEntryModal
        show={showManualEntryModal}
        onHide={() => setShowManualEntryModal(false)}
        onSuccess={handleManualEntrySuccess}
      />
    </div>
  );
}

export default ActiveCard;
```

#### Check-in Modal (components/CheckInModal.js)

```javascript
import React, { useState } from 'react';
import { staysAPI } from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';

function CheckInModal({ show, onHide, stay, onSuccess }) {
  const [spotType, setSpotType] = useState('A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      await staysAPI.checkIn(stay.id, spotType);
      onSuccess();
    } catch (err) {
      setError('Failed to check in stay');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Check-in Stay</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <strong>License Plate:</strong> {stay.vehicle.license_plate}
        </p>
        <p>
          <strong>Vehicle Type:</strong> {stay.vehicle.vehicle_type}
        </p>
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Select Spot Type</Form.Label>
            <Form.Select 
              value={spotType} 
              onChange={(e) => setSpotType(e.target.value)}
              disabled={loading}
            >
              <option value="A">Type A</option>
              <option value="B">Type B</option>
              <option value="C">Type C</option>
              <option value="Special">Special</option>
            </Form.Select>
          </Form.Group>
          
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Processing...' : 'Check-in'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default CheckInModal;
```

#### Check-out Modal (components/CheckOutModal.js)

```javascript
import React, { useState } from 'react';
import { staysAPI } from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';

function CheckOutModal({ show, onHide, stay, onSuccess }) {
  const [finalPrice, setFinalPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      await staysAPI.checkOut(stay.id, parseFloat(finalPrice));
      onSuccess();
    } catch (err) {
      setError('Failed to check out stay');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Check-out Stay</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <strong>License Plate:</strong> {stay.vehicle.license_plate}
        </p>
        <p>
          <strong>Vehicle Type:</strong> {stay.vehicle.vehicle_type}
        </p>
        <p>
          <strong>Parking Spot:</strong> {stay.parking_spot ? `${stay.parking_spot.spot_type} - ${stay.parking_spot.spot_number}` : 'No spot assigned'}
        </p>
        <p>
          <strong>Check-in Time:</strong> {new Date(stay.check_in_time).toLocaleString()}
        </p>
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Final Price</Form.Label>
            <Form.Control 
              type="number" 
              step="0.01"
              min="0"
              value={finalPrice} 
              onChange={(e) => setFinalPrice(e.target.value)}
              disabled={loading}
              required
            />
          </Form.Group>
          
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Processing...' : 'Check-out'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default CheckOutModal;
```

#### Discard Modal (components/DiscardModal.js)

```javascript
import React, { useState } from 'react';
import { staysAPI } from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';

function DiscardModal({ show, onHide, stay, onSuccess }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      await staysAPI.discard(stay.id, reason);
      onSuccess();
    } catch (err) {
      setError('Failed to discard stay');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Discard Stay</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <strong>License Plate:</strong> {stay.vehicle.license_plate}
        </p>
        <p>
          <strong>Vehicle Type:</strong> {stay.vehicle.vehicle_type}
        </p>
        <p>
          <strong>Detection Time:</strong> {new Date(stay.detection_time).toLocaleString()}
        </p>
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Reason for Discard</Form.Label>
            <Form.Select 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              required
            >
              <option value="">Select a reason</option>
              <option value="False detection">False detection</option>
              <option value="Unauthorized vehicle">Unauthorized vehicle</option>
              <option value="Sedan">Sedan (will blacklist vehicle)</option>
              <option value="Other">Other</option>
            </Form.Select>
          </Form.Group>
          
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={loading}>
              {loading ? 'Processing...' : 'Discard'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default DiscardModal;
```

#### Manual Entry Modal (components/ManualEntryModal.js)

```javascript
import React, { useState } from 'react';
import { staysAPI } from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';

function ManualEntryModal({ show, onHide, onSuccess }) {
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Caravan');
  const [spotType, setSpotType] = useState('A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      await staysAPI.createManualEntry(licensePlate, vehicleType, spotType);
      onSuccess();
      
      // Reset form
      setLicensePlate('');
      setVehicleType('Caravan');
      setSpotType('A');
    } catch (err) {
      setError('Failed to create manual entry');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Add Manual Entry</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>License Plate</Form.Label>
            <Form.Control 
              type="text" 
              value={licensePlate} 
              onChange={(e) => setLicensePlate(e.target.value)}
              disabled={loading}
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Vehicle Type</Form.Label>
            <Form.Select 
              value={vehicleType} 
              onChange={(e) => setVehicleType(e.target.value)}
              disabled={loading}
            >
              <option value="Caravan">Caravan</option>
              <option value="Motorhome">Motorhome</option>
              <option value="Camper">Camper</option>
              <option value="Other">Other</option>
            </Form.Select>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Spot Type</Form.Label>
            <Form.Select 
              value={spotType} 
              onChange={(e) => setSpotType(e.target.value)}
              disabled={loading}
            >
              <option value="A">Type A</option>
              <option value="B">Type B</option>
              <option value="C">Type C</option>
              <option value="Special">Special</option>
            </Form.Select>
          </Form.Group>
          
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Entry'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default ManualEntryModal;
```

### 2.6. Pages

#### Login (pages/Login.js)

```javascript
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await login(username, password);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1 className="text-center">Parking Manager</h1>
        <h2 className="text-center">Login</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          {error && <div className="alert alert-danger">{error}</div>}
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="text-center mt-3">
          <p>Default credentials: admin / admin123</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
```

#### Dashboard (pages/Dashboard.js)

```javascript
import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import PendingCard from '../components/PendingCard';
import ActiveCard from '../components/ActiveCard';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      <div className="container">
        <h1 className="page-title">Dashboard</h1>
        
        {dashboardData && (
          <div className="stats-container mb-4">
            <div className="stat-card">
              <h3>Total Spots</h3>
              <p className="stat-value">{dashboardData.total_spots}</p>
            </div>
            <div className="stat-card">
              <h3>Occupied Spots</h3>
              <p className="stat-value">{dashboardData.occupied_spots}</p>
            </div>
            <div className="stat-card">
              <h3>Available Spots</h3>
              <p className="stat-value">{dashboardData.available_spots}</p>
            </div>
          </div>
        )}
        
        <div className="row">
          <div className="col-md-6 mb-4">
            <PendingCard />
          </div>
          <div className="col-md-6 mb-4">
            <ActiveCard />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
```

#### History (pages/History.js)

```javascript
import React, { useState, useEffect } from 'react';
import { historyAPI } from '../services/api';

function History() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistoryLogs();
  }, []);

  const fetchHistoryLogs = async () => {
    try {
      setLoading(true);
      const data = await historyAPI.getLogs();
      setLogs(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch history logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDetails = (details) => {
    if (!details) return '-';
    
    return Object.entries(details).map(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `${formattedKey}: ${value}`;
    }).join(', ');
  };

  if (loading) return <div className="loading">Loading history...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="history">
      <div className="container">
        <h1 className="page-title">History</h1>
        
        {logs.length === 0 ? (
          <p>No history logs found</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Action</th>
                  <th>Timestamp</th>
                  <th>Details</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>{log.id}</td>
                    <td>{log.action}</td>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{formatDetails(log.details)}</td>
                    <td>{log.user_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
```

### 2.7. Main App Component (App.js)

```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import './App.css';

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route 
              path="/login" 
              element={currentUser ? <Navigate to="/" /> : <Login />} 
            />
            <Route 
              path="/" 
              element={currentUser ? <Dashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/history" 
              element={currentUser ? <History /> : <Navigate to="/login" />} 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
```

### 2.8. Index (index.js)

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## 3. Docker Configuration

### 3.1. Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: parking_db
      POSTGRES_USER: parking_user
      POSTGRES_PASSWORD: parking_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U parking_user -d parking_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://parking_user:parking_password@db:5432/parking_db
      - SECRET_KEY=your-secret-key-here-change-in-production

  frontend:
    build: ./frontend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:8000

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend

volumes:
  postgres_data:
```

### 3.2. Backend Dockerfile (backend/Dockerfile)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3.3. Frontend Dockerfile (frontend/Dockerfile)

```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3.4. Nginx Configuration (nginx.conf)

```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:8000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## 4. README.md

```markdown
# Caravan Parking Management System

A web application for managing caravan parking operations with automated detection and manual management capabilities.

## Features

- **Automatic Detection**: External script integration for vehicle detection
- **Stay Management**: Manage pending, active, and completed stays
- **Parking Spot Management**: Track 66 parking spots of different types (A, B, C, Special)
- **User Authentication**: JWT-based authentication for operators
- **Audit Trail**: Complete history of all actions performed by operators
- **Responsive UI**: React-based frontend with intuitive interface

## System Architecture

- **Backend**: Python with FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Frontend**: React (Single Page Application)
- **Containerization**: Docker and Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- Basic knowledge of command line

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd dokerized-parking-manager
   ```

2. Build and run the application:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:80
   - Backend API: http://localhost:80/api
   - API Documentation: http://localhost:80/api/docs

4. Default login credentials:
   - Username: `admin`
   - Password: `admin123`

## Detailed Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the frontend server:
   ```bash
   npm start
   ```

### Database Setup

The database is automatically set up with Docker Compose. To manually create the database tables:

1. Access the backend container:
   ```bash
   docker-compose exec backend bash
   ```

2. Run the following command:
   ```bash
   alembic upgrade head
   ```

## API Documentation

The API documentation is available at http://localhost:80/api/docs when the application is running.

### Key Endpoints

- `POST /api/auth/token` - Get JWT token
- `GET /api/stays/pending` - Get pending stays
- `GET /api/stays/active` - Get active stays
- `POST /api/stays/{stay_id}/check-in` - Check-in a stay
- `POST /api/stays/{stay_id}/check-out` - Check-out a stay
- `POST /api/stays/{stay_id}/discard` - Discard a stay
- `POST /api/stays/manual` - Create manual entry
- `GET /api/dashboard/data` - Get dashboard data
- `GET /api/history` - Get history logs

## Workflow

1. **Detection**: External script detects vehicle and creates a pending stay
2. **Management**: Operator reviews pending stays and either:
   - **Discards** the stay (optionally blacklisting the vehicle)
   - **Checks-in** the stay, assigning a parking spot
3. **Active Stays**: Operator manages active stays and can:
   - **Check-out** the stay, calculating the final price
   - **Create manual entries** for vehicles not detected automatically
4. **History**: All actions are logged with user attribution for audit purposes

## Development

### Adding New Features

1. Backend:
   - Add new models to `backend/app/models.py`
   - Create new CRUD functions in `backend/app/crud.py`
   - Add new API endpoints in `backend/app/api/`

2. Frontend:
   - Create new components in `frontend/src/components/`
   - Add new pages in `frontend/src/pages/`
   - Update API service in `frontend/src/services/api.js`

### Database Migrations

To create a new migration:

1. Access the backend container:
   ```bash
   docker-compose exec backend bash
   ```

2. Create a migration:
   ```bash
   alembic revision --autogenerate -m "Description of changes"
   ```

3. Apply the migration:
   ```bash
   alembic upgrade head
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Ensure PostgreSQL is running: `docker-compose ps`
   - Check database connection string in backend environment variables

2. **Frontend Cannot Connect to Backend**:
   - Check that both services are running: `docker-compose ps`
   - Verify API proxy configuration in nginx.conf

3. **Authentication Issues**:
   - Verify JWT secret key is set correctly
   - Check that token is being stored in localStorage

### Logs

To view logs for a specific service:
```bash
docker-compose logs [service-name]
```

Example:
```bash
docker-compose logs backend
```

## License

This project is licensed under the MIT License.