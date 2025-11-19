from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, JSON, Float
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

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PREPAID = "prepaid"
    PAID = "paid"
    UNPAID = "unpaid"  # ← NUEVO: Para sinpas

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
    is_blacklisted = Column(Boolean, default=False)  # Para vehículos que solo pasan
    
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
    detection_time = Column(DateTime, default=func.now())
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    status = Column(Enum(StayStatus), default=StayStatus.PENDING)
    final_price = Column(Float, nullable=True)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    prepaid_amount = Column(Float, nullable=True)
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

# ============================================================================
# NUEVA TABLA: BLACKLIST (Lista negra de morosos)
# ============================================================================

class Blacklist(Base):
    __tablename__ = "blacklist"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    license_plate = Column(String, index=True)  # Por si se borra el vehículo
    reason = Column(String, default="sinpa")
    amount_owed = Column(Float)
    incident_date = Column(DateTime, default=func.now())
    stay_id = Column(Integer, ForeignKey("stays.id"), nullable=True)
    notes = Column(String, nullable=True)
    resolved = Column(Boolean, default=False)
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="blacklist_entries")
    stay = relationship("Stay")