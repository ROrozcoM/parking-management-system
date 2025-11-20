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

# ============================================================================
# AÑADE ESTOS ENUMS NUEVOS DESPUÉS DE PaymentStatus Y ANTES DE UserRole
# ============================================================================

class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    TRANSFER = "transfer"

class CashSessionStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"

class TransactionType(str, Enum):
    CHECKOUT = "checkout"
    PREPAYMENT = "prepayment"
    WITHDRAWAL = "withdrawal"
    ADJUSTMENT = "adjustment"
    INITIAL = "initial"

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


# ============================================================================
# AÑADE ESTOS SCHEMAS AL FINAL DE TU schemas.py (DESPUÉS DE BlacklistCheck)
# ============================================================================

# ============================================================================
# SCHEMAS PARA CASH SESSION
# ============================================================================

class CashSessionCreate(BaseModel):
    initial_amount: float = Field(..., gt=0, description="Importe inicial en caja")

class CashSessionClose(BaseModel):
    actual_final_amount: float = Field(..., ge=0, description="Importe real al cerrar")
    notes: Optional[str] = Field(None, description="Notas sobre el cierre")

class CashSessionResponse(BaseModel):
    id: int
    opened_at: datetime
    closed_at: Optional[datetime]
    opened_by_user_id: int
    closed_by_user_id: Optional[int]
    initial_amount: float
    expected_final_amount: Optional[float]
    actual_final_amount: Optional[float]
    difference: Optional[float]
    status: CashSessionStatus
    notes: Optional[str]
    
    class Config:
        from_attributes = True

class CashSessionSummary(BaseModel):
    """Resumen de la sesión de caja activa"""
    id: int
    opened_at: datetime
    opened_by_username: str
    initial_amount: float
    total_cash_in: float  # Ingresos en efectivo
    total_withdrawals: float  # Retiros
    expected_amount: float  # Inicial + ingresos - retiros
    pending_transactions_count: int  # Transacciones sin registrar


# ============================================================================
# SCHEMAS PARA CASH TRANSACTION
# ============================================================================

class CashTransactionCreate(BaseModel):
    transaction_type: TransactionType
    amount_due: float = Field(..., description="Importe a cobrar")
    amount_paid: Optional[float] = Field(None, description="Importe pagado por el cliente")
    payment_method: PaymentMethod
    stay_id: Optional[int] = Field(None, description="ID del stay relacionado")
    notes: Optional[str] = None

class RegisterPendingTransaction(BaseModel):
    """Para registrar una transacción pendiente (checkout/prepayment)"""
    payment_method: PaymentMethod
    amount_paid: float = Field(..., gt=0, description="Cantidad que pagó el cliente")

class WithdrawalCreate(BaseModel):
    """Para registrar un retiro de caja"""
    amount: float = Field(..., gt=0, description="Cantidad a retirar")
    notes: Optional[str] = Field(None, description="Motivo del retiro")

class CashTransactionResponse(BaseModel):
    id: int
    cash_session_id: int
    timestamp: datetime
    transaction_type: TransactionType
    stay_id: Optional[int]
    amount_due: float
    amount_paid: Optional[float]
    change_given: Optional[float]
    payment_method: PaymentMethod
    user_id: int
    notes: Optional[str]
    
    # Datos adicionales para mostrar
    license_plate: Optional[str] = None  # Si está relacionado con un stay
    username: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# SCHEMAS PARA TRANSACCIONES PENDIENTES
# ============================================================================

class PendingTransaction(BaseModel):
    """Transacción de checkout/prepayment que no se ha registrado en caja"""
    stay_id: int
    license_plate: str
    transaction_type: str  # 'checkout' o 'prepayment'
    amount: float
    timestamp: datetime
    user_name: str

class PendingTransactionsList(BaseModel):
    """Lista de transacciones pendientes"""
    pending: List[PendingTransaction]
    total_amount: float