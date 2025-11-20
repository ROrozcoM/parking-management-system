from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app import models, schemas
from typing import List, Optional
from datetime import datetime
from zoneinfo import ZoneInfo
from passlib.context import CryptContext
import subprocess

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    # Truncate password to 72 bytes if needed (bcrypt limitation)
    password = user.password[:72]
    hashed_password = pwd_context.hash(password)
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
    stay.check_out_time = datetime.now(ZoneInfo("Europe/Madrid"))
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
            "vehicle_type": stay_data["vehicle_type"],
            "country": stay_data.get("country", "Spain")  # Añadir country con valor por defecto
        }
        vehicle = create_vehicle(db, schemas.VehicleCreate(**vehicle_data))
    else:
        # Si el vehículo ya existe, actualizar el country si se proporcionó uno nuevo
        if "country" in stay_data and stay_data["country"]:
            vehicle.country = stay_data["country"]
            db.commit()
            db.refresh(vehicle)
    
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
        check_in_time=datetime.now(ZoneInfo("Europe/Madrid")),
        detection_time=datetime.now(ZoneInfo("Europe/Madrid")),  # Manual entry, so detection time is now
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
        timestamp=datetime.now(ZoneInfo("Europe/Madrid")),  # ← AÑADIR ESTO
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

def initialize_parking_spots(db: Session):
    """Initialize parking spots if they don't exist"""
    # Check if parking spots already exist
    existing_spots = db.query(models.ParkingSpot).count()
    if existing_spots > 0:
        return
    
    # Create 66 parking spots with different types
    spot_types = [
        (models.SpotType.A, 20),  # 20 type A spots
        (models.SpotType.B, 20),  # 20 type B spots
        (models.SpotType.C, 20),  # 20 type C spots
        (models.SpotType.SPECIAL, 6)  # 6 special spots
    ]
    
    for spot_type, count in spot_types:
        for i in range(1, count + 1):
            spot_number = f"{spot_type.value}-{i:02d}"
            db_spot = models.ParkingSpot(
                spot_number=spot_number,
                spot_type=spot_type,
                is_occupied=False
            )
            db.add(db_spot)
    
    db.commit()

def create_default_user(db: Session):
    """Create default admin user if it doesn't exist"""
    existing_user = get_user_by_username(db, "admin")
    if existing_user:
        return
    
    user_data = schemas.UserCreate(
        username="admin",
        password="extremoduro5800"
    )
    create_user(db, user_data)
    
    # Create worker users
    create_worker_users(db)

def create_worker_users(db: Session):
    """Create worker users if they don't exist"""
    worker_users = [
        {"username": "worker1", "password": "extremoduro5800"},
        {"username": "worker2", "password": "extremoduro5800"},
        {"username": "worker3", "password": "extremoduro5800"}
    ]
    
    for worker_data in worker_users:
        existing_user = get_user_by_username(db, worker_data["username"])
        if not existing_user:
            user_data = schemas.UserCreate(
                username=worker_data["username"],
                password=worker_data["password"]
            )
            create_user(db, user_data)
            print(f"Created worker user: {worker_data['username']}")


# ============================================================================
# NUEVAS FUNCIONES PARA PAGOS ADELANTADOS Y TICKETS
# ============================================================================

def register_prepayment(db: Session, stay_id: int, amount: float, payment_method: str, user_id: int):
    """
    Registra un pago adelantado para una estancia activa.
    """
    stay = get_stay(db, stay_id)
    if not stay:
        return None
    
    if stay.status != models.StayStatus.ACTIVE:
        return None
    
    # Actualizar el stay con el pago adelantado
    stay.payment_status = models.PaymentStatus.PREPAID
    stay.prepaid_amount = amount
    
    # Registrar en historial
    log_details = {
        "amount": amount,
        "payment_method": payment_method,
        "timestamp": datetime.now(ZoneInfo("Europe/Madrid")).isoformat()
    }
    create_history_log(db, schemas.HistoryLogCreate(
        stay_id=stay_id,
        action="Prepayment registered",
        details=log_details
    ), user_id)
    
    db.commit()
    db.refresh(stay)
    return stay


def checkout_with_prepayment(db: Session, stay_id: int, final_price: float, user_id: int):
    """
    Realiza checkout considerando el pago adelantado si existe.
    Esta es una versión mejorada de check_out_stay que considera prepayments.
    """
    stay = get_stay(db, stay_id)
    if not stay:
        return None
    
    # Calcular importe restante
    remaining_amount = final_price
    if stay.prepaid_amount:
        remaining_amount = max(0, final_price - stay.prepaid_amount)
    
    # Actualizar stay
    stay.status = models.StayStatus.COMPLETED
    stay.check_out_time = datetime.now(ZoneInfo("Europe/Madrid"))
    stay.final_price = final_price
    
    # Actualizar estado de pago
    if stay.payment_status == models.PaymentStatus.PREPAID:
        stay.payment_status = models.PaymentStatus.PAID
    else:
        stay.payment_status = models.PaymentStatus.PAID
    
    # Liberar plaza de parking
    if stay.parking_spot:
        spot = db.query(models.ParkingSpot).filter(
            models.ParkingSpot.id == stay.parking_spot_id
        ).first()
        if spot:
            spot.is_occupied = False
    
    # Crear log de historial
    log_details = {
        "final_price": final_price,
        "prepaid_amount": stay.prepaid_amount,
        "remaining_amount": remaining_amount,
        "spot_number": stay.parking_spot.spot_number if stay.parking_spot else None
    }
    create_history_log(db, schemas.HistoryLogCreate(
        stay_id=stay_id,
        action="Check-out with prepayment completed",
        details=log_details
    ), user_id)
    
    db.commit()
    db.refresh(stay)
    return stay


def print_ticket(ticket_type: str, license_plate: str, check_in_time: str, 
                 amount: float, check_out_time: Optional[str] = None):
    """
    Ejecuta el script de Python para imprimir un ticket.
    
    Args:
        ticket_type: 'checkout' o 'prepayment'
        license_plate: Matrícula del vehículo
        check_in_time: Fecha/hora de entrada (formato ISO)
        amount: Importe en euros
        check_out_time: Fecha/hora de salida (solo para checkout)
    
    Returns:
        dict con success (bool) y message (str)
    """
    try:
        # Construir comando
        cmd = [
            "python3",
            "/app/print_ticket.py",
            "--type", ticket_type,
            "--license", license_plate,
            "--entry", check_in_time,
            "--amount", str(amount),
        ]
        
        # CONFIGURACIÓN DE IMPRESORA
        # Por defecto usa modo 'file' para testing (guarda en /tmp/ticket_output.bin)
        cmd.extend([
            "--printer-type", "file",
            "--output", "/tmp/ticket_output.bin"
        ])
        
        # Para usar impresora USB real, comenta las líneas de arriba y descomenta estas:
        # cmd.extend([
        #     "--printer-type", "usb",
        #     "--vendor-id", "0x04b8",  # Reemplaza con tu vendor ID
        #     "--product-id", "0x0e15"   # Reemplaza con tu product ID
        # ])
        
        # Si es checkout, añadir hora de salida
        if ticket_type == "checkout" and check_out_time:
            cmd.extend(["--exit", check_out_time])
        
        # Ejecutar el script
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            return {
                "success": True,
                "message": "Ticket impreso correctamente"
            }
        else:
            error_msg = result.stderr or result.stdout or "Error desconocido"
            return {
                "success": False,
                "message": f"Error al imprimir: {error_msg}"
            }
    
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "message": "Timeout: la impresora no responde"
        }
    except FileNotFoundError:
        return {
            "success": False,
            "message": "Script print_ticket.py no encontrado en /app/"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error inesperado: {str(e)}"
        }
    
    
# ============================================================================
# FUNCIONES PARA GESTIÓN DE LISTA NEGRA (SINPAS)
# ============================================================================

def check_blacklist(db: Session, license_plate: str):
    """
    Verifica si un vehículo está en la lista negra.
    Retorna todas las entradas no resueltas.
    """
    entries = db.query(models.Blacklist).filter(
        and_(
            models.Blacklist.license_plate == license_plate,
            models.Blacklist.resolved == False
        )
    ).all()
    
    if not entries:
        return {
            "is_blacklisted": False,
            "entries": [],
            "total_debt": 0.0
        }
    
    total_debt = sum(entry.amount_owed for entry in entries)
    
    return {
        "is_blacklisted": True,
        "entries": entries,
        "total_debt": total_debt
    }


def add_to_blacklist(db: Session, vehicle_id: int, license_plate: str, 
                     amount_owed: float, stay_id: int, notes: Optional[str] = None):
    """
    Añade un vehículo a la lista negra por no pagar (sinpa).
    """
    blacklist_entry = models.Blacklist(
        vehicle_id=vehicle_id,
        license_plate=license_plate,
        reason="sinpa",
        amount_owed=amount_owed,
        stay_id=stay_id,
        notes=notes,
        resolved=False
    )
    
    db.add(blacklist_entry)
    db.commit()
    db.refresh(blacklist_entry)
    
    return blacklist_entry


def mark_stay_as_sinpa(db: Session, stay_id: int, notes: Optional[str], user_id: int):
    """
    Marca una estancia como SINPA (no pagó) y añade el vehículo a la lista negra.
    """
    stay = get_stay(db, stay_id)
    if not stay:
        return None
    
    # Calcular el importe que debía (si no está ya calculado)
    if not stay.final_price:
        # Calcular días de estancia
        check_in = stay.check_in_time
        check_out = datetime.now(ZoneInfo("Europe/Madrid"))
        days = (check_out - check_in).days
        if days == 0:
            days = 1  # Mínimo 1 día
        
        # Tarifa por día (ajusta según tu negocio)
        daily_rate = 10.0  # 10€ por día
        stay.final_price = days * daily_rate
    
    # Marcar el stay
    stay.status = models.StayStatus.COMPLETED
    stay.check_out_time = datetime.now(ZoneInfo("Europe/Madrid"))
    stay.payment_status = models.PaymentStatus.UNPAID
    
    # Liberar plaza
    if stay.parking_spot:
        spot = db.query(models.ParkingSpot).filter(
            models.ParkingSpot.id == stay.parking_spot_id
        ).first()
        if spot:
            spot.is_occupied = False
    
    # Añadir a lista negra
    blacklist_entry = add_to_blacklist(
        db, 
        stay.vehicle_id, 
        stay.vehicle.license_plate,
        stay.final_price,
        stay_id,
        notes
    )
    
    # Registrar en historial
    log_details = {
        "reason": "sinpa",
        "amount_owed": stay.final_price,
        "notes": notes,
        "blacklist_id": blacklist_entry.id
    }
    create_history_log(db, schemas.HistoryLogCreate(
        stay_id=stay_id,
        action="Marked as SINPA - Added to blacklist",
        details=log_details
    ), user_id)
    
    db.commit()
    db.refresh(stay)
    
    return {
        "stay": stay,
        "blacklist_entry": blacklist_entry
    }


def get_all_blacklist(db: Session, resolved: bool = False):
    """
    Obtiene todas las entradas de la lista negra.
    Por defecto solo muestra las no resueltas.
    """
    query = db.query(models.Blacklist)
    
    if not resolved:
        query = query.filter(models.Blacklist.resolved == False)
    
    return query.order_by(models.Blacklist.incident_date.desc()).all()


def resolve_blacklist_entry(db: Session, blacklist_id: int, user_id: int):
    """
    Marca una entrada de lista negra como resuelta (cliente pagó).
    """
    entry = db.query(models.Blacklist).filter(models.Blacklist.id == blacklist_id).first()
    
    if not entry:
        return None
    
    entry.resolved = True
    
    # Registrar en historial del stay relacionado
    if entry.stay_id:
        log_details = {
            "blacklist_id": blacklist_id,
            "resolved_date": datetime.now(ZoneInfo("Europe/Madrid")).isoformat()
        }
        create_history_log(db, schemas.HistoryLogCreate(
            stay_id=entry.stay_id,
            action="Blacklist entry resolved - Debt paid",
            details=log_details
        ), user_id)
    
    db.commit()
    db.refresh(entry)
    
    return entry


"""
========================================
AÑADE ESTAS FUNCIONES AL FINAL DE crud.py
========================================
"""

from sqlalchemy import func, extract
from datetime import datetime, timedelta

# ============================================================================
# FUNCIONES DE ANALYTICS
# ============================================================================

def get_analytics_overview(db: Session):
    """
    Obtiene un resumen general de analytics
    """
    # Total de estancias completadas
    total_stays = db.query(models.Stay).filter(
        models.Stay.status == models.StayStatus.COMPLETED
    ).count()
    
    # Ingresos totales
    total_revenue = db.query(func.sum(models.Stay.final_price)).filter(
        models.Stay.status == models.StayStatus.COMPLETED,
        models.Stay.final_price.isnot(None)
    ).scalar() or 0.0
    
    # Total SINPAS
    total_sinpas = db.query(models.Blacklist).filter(
        models.Blacklist.resolved == False
    ).count()
    
    # Deuda pendiente de SINPAS
    debt_sinpas = db.query(func.sum(models.Blacklist.amount_owed)).filter(
        models.Blacklist.resolved == False
    ).scalar() or 0.0
    
    # Vehículos activos ahora
    active_now = db.query(models.Stay).filter(
        models.Stay.status == models.StayStatus.ACTIVE
    ).count()
    
    return {
        "total_stays": total_stays,
        "total_revenue": float(total_revenue),
        "total_sinpas": total_sinpas,
        "debt_sinpas": float(debt_sinpas),
        "active_now": active_now
    }


def get_revenue_timeline(db: Session, days: int = 30):
    """
    Obtiene ingresos diarios de los últimos X días
    """
    cutoff_date = datetime.now(ZoneInfo("Europe/Madrid")) - timedelta(days=days)
    
    results = db.query(
        func.date(models.Stay.check_out_time).label('date'),
        func.sum(models.Stay.final_price).label('revenue')
    ).filter(
        models.Stay.status == models.StayStatus.COMPLETED,
        models.Stay.check_out_time >= cutoff_date,
        models.Stay.final_price.isnot(None)
    ).group_by(
        func.date(models.Stay.check_out_time)
    ).order_by('date').all()
    
    return [
        {
            "date": r.date.strftime("%Y-%m-%d"),
            "revenue": float(r.revenue or 0)
        }
        for r in results
    ]


def get_country_distribution(db: Session):
    """
    Distribución de clientes por país
    """
    results = db.query(
        models.Vehicle.country,
        func.count(models.Stay.id).label('count'),
        func.sum(models.Stay.final_price).label('revenue')
    ).join(
        models.Stay, models.Vehicle.id == models.Stay.vehicle_id
    ).filter(
        models.Stay.status == models.StayStatus.COMPLETED,
        models.Vehicle.country.isnot(None)
    ).group_by(
        models.Vehicle.country
    ).order_by(
        func.count(models.Stay.id).desc()
    ).all()
    
    return [
        {
            "country": r.country or "Unknown",
            "count": r.count,
            "revenue": float(r.revenue or 0)
        }
        for r in results
    ]


def get_peak_hours(db: Session):
    """
    Horas pico de entrada (check-in)
    """
    results = db.query(
        extract('hour', models.Stay.check_in_time).label('hour'),
        func.count(models.Stay.id).label('count')
    ).filter(
        models.Stay.check_in_time.isnot(None)
    ).group_by('hour').order_by('hour').all()
    
    return [
        {
            "hour": int(r.hour),
            "count": r.count
        }
        for r in results
    ]


def get_vehicle_types_distribution(db: Session):
    """
    Distribución de tipos de vehículos
    """
    results = db.query(
        models.Vehicle.vehicle_type,
        func.count(models.Stay.id).label('count')
    ).join(
        models.Stay, models.Vehicle.id == models.Stay.vehicle_id
    ).filter(
        models.Stay.status == models.StayStatus.COMPLETED
    ).group_by(
        models.Vehicle.vehicle_type
    ).all()
    
    return [
        {
            "type": r.vehicle_type,
            "count": r.count
        }
        for r in results
    ]


def get_payment_methods_distribution(db: Session):
    """
    Distribución de métodos de pago (prepago vs normal)
    """
    prepaid = db.query(func.count(models.Stay.id)).filter(
        models.Stay.status == models.StayStatus.COMPLETED,
        models.Stay.payment_status == models.PaymentStatus.PREPAID
    ).scalar() or 0
    
    normal = db.query(func.count(models.Stay.id)).filter(
        models.Stay.status == models.StayStatus.COMPLETED,
        models.Stay.payment_status == models.PaymentStatus.PAID
    ).scalar() or 0
    
    unpaid = db.query(func.count(models.Stay.id)).filter(
        models.Stay.status == models.StayStatus.COMPLETED,
        models.Stay.payment_status == models.PaymentStatus.UNPAID
    ).scalar() or 0
    
    return [
        {"method": "Pago Adelantado", "count": prepaid},
        {"method": "Pago Normal", "count": normal},
        {"method": "SINPA", "count": unpaid}
    ]


def get_average_stay_duration_by_country(db: Session):
    """
    Duración promedio de estancia por país
    """
    results = db.query(
        models.Vehicle.country,
        func.avg(
            func.extract('epoch', models.Stay.check_out_time - models.Stay.check_in_time) / 86400
        ).label('avg_days')
    ).join(
        models.Stay, models.Vehicle.id == models.Stay.vehicle_id
    ).filter(
        models.Stay.status == models.StayStatus.COMPLETED,
        models.Stay.check_in_time.isnot(None),
        models.Stay.check_out_time.isnot(None),
        models.Vehicle.country.isnot(None)
    ).group_by(
        models.Vehicle.country
    ).order_by(
        func.avg(
            func.extract('epoch', models.Stay.check_out_time - models.Stay.check_in_time)
        ).desc()
    ).limit(10).all()
    
    return [
        {
            "country": r.country or "Unknown",
            "avg_days": round(float(r.avg_days or 0), 2)
        }
        for r in results
    ]


def get_monthly_comparison(db: Session, months: int = 6):
    """
    Comparación mensual de ingresos
    """
    cutoff_date = datetime.now(ZoneInfo("Europe/Madrid")) - timedelta(days=months*30)
    
    results = db.query(
        extract('year', models.Stay.check_out_time).label('year'),
        extract('month', models.Stay.check_out_time).label('month'),
        func.count(models.Stay.id).label('count'),
        func.sum(models.Stay.final_price).label('revenue')
    ).filter(
        models.Stay.status == models.StayStatus.COMPLETED,
        models.Stay.check_out_time >= cutoff_date,
        models.Stay.final_price.isnot(None)
    ).group_by('year', 'month').order_by('year', 'month').all()
    
    month_names = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ]
    
    return [
        {
            "period": f"{month_names[int(r.month)-1]} {int(r.year)}",
            "count": r.count,
            "revenue": float(r.revenue or 0)
        }
        for r in results
    ]


def get_weekday_distribution(db: Session):
    """
    Distribución de check-ins por día de la semana
    """
    results = db.query(
        extract('dow', models.Stay.check_in_time).label('weekday'),
        func.count(models.Stay.id).label('count')
    ).filter(
        models.Stay.check_in_time.isnot(None)
    ).group_by('weekday').order_by('weekday').all()
    
    day_names = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    
    return [
        {
            "day": day_names[int(r.weekday)],
            "count": r.count
        }
        for r in results
    ]


# ============================================================================
# FUNCIONES PARA SISTEMA DE CAJA
# ============================================================================

def get_active_cash_session(db: Session):
    """Obtiene la sesión de caja activa (si existe)"""
    return db.query(models.CashSession).filter(
        models.CashSession.status == models.CashSessionStatus.OPEN
    ).first()


def open_cash_session(db: Session, initial_amount: float, user_id: int):
    """Abre una nueva sesión de caja"""
    # Verificar que no haya otra sesión abierta
    existing = get_active_cash_session(db)
    if existing:
        raise ValueError("Ya hay una sesión de caja abierta")
    
    session = models.CashSession(
        initial_amount=initial_amount,
        opened_by_user_id=user_id,
        status=models.CashSessionStatus.OPEN
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Crear transacción inicial
    initial_transaction = models.CashTransaction(
        cash_session_id=session.id,
        transaction_type=models.TransactionType.INITIAL,
        amount_due=initial_amount,
        payment_method=models.PaymentMethod.CASH,
        user_id=user_id,
        notes="Apertura de caja"
    )
    db.add(initial_transaction)
    db.commit()
    
    return session


def close_cash_session(db: Session, session_id: int, actual_final_amount: float, 
                       notes: Optional[str], user_id: int):
    """Cierra una sesión de caja"""
    session = db.query(models.CashSession).filter(
        models.CashSession.id == session_id
    ).first()
    
    if not session:
        raise ValueError("Sesión no encontrada")
    
    if session.status == models.CashSessionStatus.CLOSED:
        raise ValueError("La sesión ya está cerrada")
    
    # Calcular el importe esperado
    expected = calculate_expected_amount(db, session_id)
    
    session.closed_at = datetime.now(ZoneInfo("Europe/Madrid"))
    session.closed_by_user_id = user_id
    session.expected_final_amount = expected
    session.actual_final_amount = actual_final_amount
    session.difference = actual_final_amount - expected
    session.status = models.CashSessionStatus.CLOSED
    session.notes = notes
    
    db.commit()
    db.refresh(session)
    
    return session


def calculate_expected_amount(db: Session, session_id: int) -> float:
    """Calcula el importe esperado en caja"""
    session = db.query(models.CashSession).filter(
        models.CashSession.id == session_id
    ).first()
    
    if not session:
        return 0.0
    
    # Inicial
    expected = session.initial_amount
    
    # Sumar ingresos en efectivo
    cash_in = db.query(func.sum(models.CashTransaction.amount_due)).filter(
        and_(
            models.CashTransaction.cash_session_id == session_id,
            models.CashTransaction.transaction_type.in_([
                models.TransactionType.CHECKOUT,
                models.TransactionType.PREPAYMENT
            ]),
            models.CashTransaction.payment_method == models.PaymentMethod.CASH
        )
    ).scalar() or 0.0
    
    expected += cash_in
    
    # Restar retiros
    withdrawals = db.query(func.sum(models.CashTransaction.amount_due)).filter(
        and_(
            models.CashTransaction.cash_session_id == session_id,
            models.CashTransaction.transaction_type == models.TransactionType.WITHDRAWAL
        )
    ).scalar() or 0.0
    
    expected -= withdrawals
    
    return expected


def get_cash_session_summary(db: Session, session_id: int):
    """Obtiene el resumen de una sesión de caja"""
    session = db.query(models.CashSession).filter(
        models.CashSession.id == session_id
    ).first()
    
    if not session:
        return None
    
    # Total ingresos en efectivo
    cash_in = db.query(func.sum(models.CashTransaction.amount_due)).filter(
        and_(
            models.CashTransaction.cash_session_id == session_id,
            models.CashTransaction.transaction_type.in_([
                models.TransactionType.CHECKOUT,
                models.TransactionType.PREPAYMENT
            ]),
            models.CashTransaction.payment_method == models.PaymentMethod.CASH
        )
    ).scalar() or 0.0
    
    # Total retiros
    withdrawals = db.query(func.sum(models.CashTransaction.amount_due)).filter(
        and_(
            models.CashTransaction.cash_session_id == session_id,
            models.CashTransaction.transaction_type == models.TransactionType.WITHDRAWAL
        )
    ).scalar() or 0.0
    
    # Transacciones pendientes
    pending_count = db.query(func.count(models.Stay.id)).filter(
        and_(
            models.Stay.status == models.StayStatus.COMPLETED,
            models.Stay.cash_registered == False,
            models.Stay.check_out_time >= session.opened_at
        )
    ).scalar() or 0
    
    # Obtener username del que abrió
    user = db.query(models.User).filter(models.User.id == session.opened_by_user_id).first()
    username = user.username if user else "Unknown"
    
    return {
        "id": session.id,
        "opened_at": session.opened_at,
        "opened_by_username": username,
        "initial_amount": session.initial_amount,
        "total_cash_in": cash_in,
        "total_withdrawals": withdrawals,
        "expected_amount": session.initial_amount + cash_in - withdrawals,
        "pending_transactions_count": pending_count
    }


def register_withdrawal(db: Session, session_id: int, amount: float, 
                       notes: Optional[str], user_id: int):
    """Registra un retiro de caja"""
    session = get_active_cash_session(db)
    
    if not session or session.id != session_id:
        raise ValueError("No hay sesión de caja activa")
    
    transaction = models.CashTransaction(
        cash_session_id=session_id,
        transaction_type=models.TransactionType.WITHDRAWAL,
        amount_due=amount,
        payment_method=models.PaymentMethod.CASH,
        user_id=user_id,
        notes=notes
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return transaction


def get_pending_transactions(db: Session):
    """Obtiene todas las transacciones pendientes de registrar en caja"""
    pending = []
    total = 0.0
    
    # 1. PREPAYMENTS pendientes (stays ACTIVOS con prepago no registrado)
    prepayments = db.query(models.Stay).filter(
        and_(
            models.Stay.status == models.StayStatus.ACTIVE,
            models.Stay.prepaid_amount.isnot(None),
            models.Stay.prepayment_cash_registered == False
        )
    ).order_by(models.Stay.check_in_time.desc()).all()
    
    for stay in prepayments:
        user = db.query(models.User).filter(models.User.id == stay.user_id).first()
        username = user.username if user else "Unknown"
        
        pending.append({
            "stay_id": stay.id,
            "license_plate": stay.vehicle.license_plate,
            "transaction_type": "prepayment",
            "amount": stay.prepaid_amount,
            "timestamp": stay.check_in_time,  # Usar check_in_time para prepayments
            "user_name": username,
            "is_prepayment": True  # Flag para identificar
        })
        
        total += stay.prepaid_amount
    
    # 2. CHECKOUTS pendientes (stays COMPLETADOS no registrados en caja)
    checkouts = db.query(models.Stay).filter(
        and_(
            models.Stay.status == models.StayStatus.COMPLETED,
            models.Stay.cash_registered == False,
            models.Stay.final_price.isnot(None)
        )
    ).order_by(models.Stay.check_out_time.desc()).all()
    
    for stay in checkouts:
        user = db.query(models.User).filter(models.User.id == stay.user_id).first()
        username = user.username if user else "Unknown"
        
        # Calcular el importe a cobrar (restando prepago si existe Y ya está registrado)
        amount_due = stay.final_price
        if stay.prepaid_amount and stay.prepayment_cash_registered:
            amount_due = max(0, stay.final_price - stay.prepaid_amount)
        
        pending.append({
            "stay_id": stay.id,
            "license_plate": stay.vehicle.license_plate,
            "transaction_type": "checkout",
            "amount": amount_due,
            "timestamp": stay.check_out_time,
            "user_name": username,
            "is_prepayment": False,
            "has_prepayment": stay.prepaid_amount is not None,
            "prepaid_amount": stay.prepaid_amount if stay.prepaid_amount else 0
        })
        
        total += amount_due
    
    return {
        "pending": pending,
        "total_amount": total
    }


def register_pending_transaction(db: Session, stay_id: int, payment_method: str,
                                 amount_paid: float, user_id: int):
    """Registra en caja una transacción pendiente"""
    stay = get_stay(db, stay_id)
    
    if not stay:
        raise ValueError("Stay no encontrado")
    
    # Verificar que hay sesión activa
    session = get_active_cash_session(db)
    if not session:
        raise ValueError("No hay sesión de caja activa")
    
    # Determinar si es prepayment o checkout
    is_prepayment = stay.status == models.StayStatus.ACTIVE and stay.prepaid_amount is not None
    
    if is_prepayment:
        # CASO 1: Registrando un PREPAYMENT
        if stay.prepayment_cash_registered:
            raise ValueError("Este prepayment ya fue registrado en caja")
        
        amount_due = stay.prepaid_amount
        transaction_type = models.TransactionType.PREPAYMENT
        
    else:
        # CASO 2: Registrando un CHECKOUT
        if stay.cash_registered:
            raise ValueError("Este checkout ya fue registrado en caja")
        
        # Calcular importe debido (restar prepago si ya está registrado)
        amount_due = stay.final_price
        if stay.prepaid_amount and stay.prepayment_cash_registered:
            amount_due = max(0, stay.final_price - stay.prepaid_amount)
        
        transaction_type = models.TransactionType.CHECKOUT
    
    # Calcular cambio
    change_given = 0.0
    if payment_method == models.PaymentMethod.CASH.value:
        change_given = amount_paid - amount_due
        if change_given < 0:
            raise ValueError("El importe pagado no puede ser menor al precio")
    
    # Crear transacción de caja
    transaction = models.CashTransaction(
        cash_session_id=session.id,
        transaction_type=transaction_type,
        stay_id=stay_id,
        amount_due=amount_due,
        amount_paid=amount_paid if payment_method == models.PaymentMethod.CASH.value else amount_due,
        change_given=change_given if payment_method == models.PaymentMethod.CASH.value else 0,
        payment_method=models.PaymentMethod(payment_method),
        user_id=user_id
    )
    
    db.add(transaction)
    
    # Marcar como registrado según el caso
    if is_prepayment:
        stay.prepayment_cash_registered = True
    else:
        stay.cash_registered = True
        stay.payment_method = models.PaymentMethod(payment_method)
        stay.amount_paid = amount_paid
        stay.change_given = change_given
    
    db.commit()
    db.refresh(transaction)
    
    return transaction


def get_cash_transactions(db: Session, session_id: int):
    """Obtiene todas las transacciones de una sesión de caja"""
    transactions = db.query(models.CashTransaction).filter(
        models.CashTransaction.cash_session_id == session_id
    ).order_by(models.CashTransaction.timestamp.desc()).all()
    
    result = []
    for tx in transactions:
        # Obtener datos adicionales
        license_plate = None
        if tx.stay_id:
            stay = db.query(models.Stay).filter(models.Stay.id == tx.stay_id).first()
            if stay:
                license_plate = stay.vehicle.license_plate
        
        user = db.query(models.User).filter(models.User.id == tx.user_id).first()
        username = user.username if user else "Unknown"
        
        result.append({
            "id": tx.id,
            "cash_session_id": tx.cash_session_id,
            "timestamp": tx.timestamp,
            "transaction_type": tx.transaction_type,
            "stay_id": tx.stay_id,
            "amount_due": tx.amount_due,
            "amount_paid": tx.amount_paid,
            "change_given": tx.change_given,
            "payment_method": tx.payment_method,
            "user_id": tx.user_id,
            "notes": tx.notes,
            "license_plate": license_plate,
            "username": username
        })
    
    return result






