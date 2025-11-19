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

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PREPAID = "prepaid"
    PAID = "paid"
    UNPAID = "unpaid"  # ← NUEVO: Para sinpas

class UserRole(str, Enum):
    ADMIN = "admin"
    WORKER = "worker"

# User schemas
class UserBase(BaseModel):
    username: str
    is_active: bool = True
    role: UserRole = UserRole.WORKER

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
    payment_status: PaymentStatus = PaymentStatus.PENDING
    prepaid_amount: Optional[float] = None

class StayCreate(StayBase):
    license_plate: str
    vehicle_type: str

class StayUpdate(BaseModel):
    parking_spot_id: Optional[int] = None
    status: Optional[StayStatus] = None
    final_price: Optional[float] = None
    payment_status: Optional[PaymentStatus] = None
    prepaid_amount: Optional[float] = None

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

# Prepayment schema
class PrepaymentData(BaseModel):
    stay_id: int
    amount: float
    payment_method: Optional[str] = "cash"

# ============================================================================
# NUEVOS SCHEMAS: BLACKLIST
# ============================================================================

class BlacklistBase(BaseModel):
    vehicle_id: int
    license_plate: str
    reason: str = "sinpa"
    amount_owed: float
    stay_id: Optional[int] = None
    notes: Optional[str] = None

class BlacklistCreate(BlacklistBase):
    pass

class Blacklist(BlacklistBase):
    id: int
    incident_date: datetime
    resolved: bool = False
    
    class Config:
        from_attributes = True

class BlacklistCheck(BaseModel):
    is_blacklisted: bool
    entries: List[Blacklist] = []
    total_debt: float = 0.0