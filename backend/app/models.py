from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from zoneinfo import ZoneInfo
import enum

Base = declarative_base()

# Helper function para timezone de Madrid
def madrid_now():
    return datetime.now(ZoneInfo("Europe/Madrid"))

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

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PREPAID = "prepaid"
    PAID = "paid"
    UNPAID = "unpaid"

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    TRANSFER = "transfer"

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    WORKER = "worker"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(Enum(UserRole), default=UserRole.WORKER)
    
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
    is_rental = Column(Boolean, default=False)  # ← Vehículos de alquiler
    
    # Relationships
    stays = relationship("Stay", back_populates="vehicle")
    blacklist_entries = relationship("Blacklist", back_populates="vehicle")

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
    detection_time = Column(DateTime(timezone=True), default=madrid_now)
    check_in_time = Column(DateTime(timezone=True), nullable=True)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(StayStatus), default=StayStatus.PENDING)
    final_price = Column(Float, nullable=True)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    prepaid_amount = Column(Float, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Campos para sistema de caja
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    amount_paid = Column(Float, nullable=True)
    change_given = Column(Float, nullable=True)
    cash_registered = Column(Boolean, default=False)
    prepayment_cash_registered = Column(Boolean, default=False)  # ← AÑADIR ESTE
    
    # Relationships (siempre al final)
    vehicle = relationship("Vehicle", back_populates="stays")
    parking_spot = relationship("ParkingSpot", back_populates="stays")
    user = relationship("User", back_populates="stays")
    history_logs = relationship("HistoryLog", back_populates="stay")

class HistoryLog(Base):
    __tablename__ = "history_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    stay_id = Column(Integer, ForeignKey("stays.id"))
    action = Column(String)
    timestamp = Column(DateTime(timezone=True), default=madrid_now)  # ← TIMEZONE TRUE
    details = Column(JSON, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    stay = relationship("Stay", back_populates="history_logs")
    user = relationship("User", back_populates="history_logs")

class Blacklist(Base):
    __tablename__ = "blacklist"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    license_plate = Column(String, index=True)
    reason = Column(String, default="sinpa")
    amount_owed = Column(Float)
    incident_date = Column(DateTime(timezone=True), default=madrid_now)  # ← TIMEZONE TRUE
    stay_id = Column(Integer, ForeignKey("stays.id"), nullable=True)
    notes = Column(String, nullable=True)
    resolved = Column(Boolean, default=False)
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="blacklist_entries")
    stay = relationship("Stay")

# ============================================================================
# AÑADE ESTAS CLASES AL FINAL DE TU models.py (después de Blacklist)
# ============================================================================

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    TRANSFER = "transfer"

class CashSessionStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"

class TransactionType(str, enum.Enum):
    CHECKOUT = "checkout"
    PREPAYMENT = "prepayment"
    WITHDRAWAL = "withdrawal"
    ADJUSTMENT = "adjustment"
    INITIAL = "initial"

class CashSession(Base):
    __tablename__ = "cash_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    opened_at = Column(DateTime(timezone=True), default=madrid_now)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    opened_by_user_id = Column(Integer, ForeignKey("users.id"))
    closed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Importe inicial
    initial_amount = Column(Float)
    
    # DESGLOSE ESPERADO POR MÉTODO
    expected_cash = Column(Float, nullable=True)
    expected_card = Column(Float, nullable=True)
    expected_transfer = Column(Float, nullable=True)
    expected_final_amount = Column(Float, nullable=True)  # Total esperado
    
    # DESGLOSE REAL AL CERRAR
    actual_cash = Column(Float, nullable=True)
    actual_card = Column(Float, nullable=True)
    actual_transfer = Column(Float, nullable=True)
    actual_final_amount = Column(Float, nullable=True)  # Total real
    
    # CONTADOR DE BILLETES Y MONEDAS
    cash_breakdown = Column(JSON, nullable=True)
    # Formato: {"500": 2, "200": 1, "100": 3, "50": 2, "20": 5, ...}
    
    # RETIRO
    suggested_withdrawal = Column(Float, nullable=True)  # Sugerencia del sistema
    actual_withdrawal = Column(Float, nullable=True)  # Lo que realmente retiró
    remaining_in_register = Column(Float, nullable=True)  # Lo que queda
    
    # Descuadre
    difference = Column(Float, nullable=True)  # Total real - Total esperado
    cash_difference = Column(Float, nullable=True)  # Solo efectivo
    
    status = Column(Enum(CashSessionStatus), default=CashSessionStatus.OPEN)
    notes = Column(String, nullable=True)
    
    # Relationships
    opened_by = relationship("User", foreign_keys=[opened_by_user_id])
    closed_by = relationship("User", foreign_keys=[closed_by_user_id])
    transactions = relationship("CashTransaction", back_populates="session")

class CashTransaction(Base):
    __tablename__ = "cash_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    cash_session_id = Column(Integer, ForeignKey("cash_sessions.id"))
    timestamp = Column(DateTime(timezone=True), default=madrid_now)
    
    transaction_type = Column(Enum(TransactionType))
    
    # Relación con Stay
    stay_id = Column(Integer, ForeignKey("stays.id"), nullable=True)
    
    # Importes
    amount_due = Column(Float)
    amount_paid = Column(Float, nullable=True)
    change_given = Column(Float, nullable=True)
    
    payment_method = Column(Enum(PaymentMethod))
    
    user_id = Column(Integer, ForeignKey("users.id"))
    notes = Column(String, nullable=True)
    
    # Relationships
    session = relationship("CashSession", back_populates="transactions")
    stay = relationship("Stay", foreign_keys=[stay_id])  # ← ESPECIFICAR foreign_keys
    user = relationship("User")