from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, get_db
from app import models
from app.api import auth, stays, dashboard, history, cash
from app.crud import register_prepayment, checkout_with_prepayment, print_ticket
from app.crud import check_blacklist, mark_stay_as_sinpa, get_all_blacklist, resolve_blacklist_entry
from app.dependencies import get_current_active_user
from typing import Optional
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import func

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Caravan Parking Management API",
    version="1.0.0",
    docs_url="/docs",  # URL for Swagger UI
    redoc_url="/redoc"  # URL for ReDoc
)

# ============================================================================
# CORS DINÁMICO - Funciona en Local y Producción
# ============================================================================
# Lee ALLOWED_ORIGINS del .env o usa localhost por defecto
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Dinámico: local o producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(stays.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(cash.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Caravan Parking Management API"}


# ============================================================================
# NUEVAS RUTAS - AÑADIDAS PARA PAGOS Y TICKETS
# ============================================================================

@app.post("/api/stays/{stay_id}/prepayment")
async def register_prepayment_endpoint(
    stay_id: int,
    amount: float,
    payment_method: str = "cash",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Registra un pago adelantado"""
    stay = register_prepayment(db, stay_id, amount, payment_method, current_user.id)
    if not stay:
        raise HTTPException(status_code=404, detail="Stay not found or not active")
    return {"success": True, "message": "Prepayment registered", "stay": stay}


import requests
from app import schemas

@app.post("/api/print-ticket")
async def print_ticket_endpoint(
    ticket_data: schemas.PrintTicketRequest,
    current_user: models.User = Depends(get_current_active_user)
):
    """Imprime un ticket enviando petición al servidor de impresión en Windows"""
    
    try:
        # URL del servidor Flask en Windows (tu IP de Windows)
        PRINTER_SERVER_URL = "http://192.168.1.184:9200/print"
        
        # Formatear fechas
        entry_dt = datetime.fromisoformat(ticket_data.check_in_time.replace('Z', '+00:00'))
        entry_formatted = entry_dt.strftime('%d/%m/%Y')
        
        exit_formatted = None
        nights = 0
        if ticket_data.check_out_time:
            exit_dt = datetime.fromisoformat(ticket_data.check_out_time.replace('Z', '+00:00'))
            exit_formatted = exit_dt.strftime('%d/%m/%Y')
            # Calcular noches
            duration = exit_dt - entry_dt
            nights = max(1, int(duration.total_seconds() / (24 * 3600)))
        
        # Preparar datos para el servidor de impresión
        payload = {
            "type": ticket_data.type,
            "license": ticket_data.license_plate,
            "entry": entry_formatted,
            "exit": exit_formatted,
            "nights": nights,
            "amount": ticket_data.amount,
            "spot_type": ticket_data.spot_type
        }
        
        # Enviar a servidor de impresión
        response = requests.post(PRINTER_SERVER_URL, json=payload, timeout=15)
        
        if response.status_code == 200:
            return {"success": True, "message": "Ticket impreso correctamente"}
        else:
            error_data = response.json()
            return {
                "success": False,
                "message": f"Error al imprimir: {error_data.get('message', 'Unknown error')}"
            }
            
    except requests.exceptions.Timeout:
        return {"success": False, "message": "Timeout al comunicar con la impresora"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "message": "No se puede conectar al servidor de impresión. ¿Está corriendo printer_server.py?"}
    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}


@app.post("/api/stays/{stay_id}/checkout-with-prepayment")
async def checkout_with_prepayment_endpoint(
    stay_id: int,
    final_price: float,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Checkout considerando pago adelantado"""
    stay = checkout_with_prepayment(db, stay_id, final_price, current_user.id)
    if not stay:
        raise HTTPException(status_code=404, detail="Stay not found")
    return {"success": True, "message": "Checkout completed", "stay": stay}

from sqlalchemy.orm import joinedload

@app.get("/api/stays/checkouts-due-today")
async def get_checkouts_due_today(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Estancias prepagadas con salida prevista HOY"""
    today = datetime.now(ZoneInfo("Europe/Madrid")).date()
    
    stays = db.query(models.Stay).options(
        joinedload(models.Stay.vehicle),
        joinedload(models.Stay.parking_spot)
    ).filter(
        models.Stay.status == models.StayStatus.ACTIVE,
        models.Stay.payment_status == models.PaymentStatus.PREPAID,
        func.date(models.Stay.check_out_time) == today
    ).order_by(models.Stay.check_out_time).all()
    
    return {
        "count": len(stays),
        "stays": stays
    }

# ============================================================================
# RUTAS PARA GESTIÓN DE LISTA NEGRA (SINPAS)
# ============================================================================

@app.get("/api/blacklist/check/{license_plate}")
async def check_vehicle_blacklist(
    license_plate: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Verifica si un vehículo está en la lista negra"""
    result = check_blacklist(db, license_plate)
    return result


@app.post("/api/stays/{stay_id}/mark-sinpa")
async def mark_sinpa_endpoint(
    stay_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Marca una estancia como SINPA y añade el vehículo a la lista negra"""
    result = mark_stay_as_sinpa(db, stay_id, notes, current_user.id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Stay not found")
    
    return {
        "success": True,
        "message": "Vehículo marcado como SINPA y añadido a lista negra",
        "stay": result["stay"],
        "blacklist_entry": result["blacklist_entry"]
    }


@app.get("/api/blacklist/")
async def get_blacklist(
    resolved: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Obtiene todas las entradas de la lista negra"""
    entries = get_all_blacklist(db, resolved)
    return entries


@app.post("/api/blacklist/{blacklist_id}/resolve")
async def resolve_blacklist(
    blacklist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Marca una entrada de lista negra como resuelta"""
    entry = resolve_blacklist_entry(db, blacklist_id, current_user.id)
    
    if not entry:
        raise HTTPException(status_code=404, detail="Blacklist entry not found")
    
    return {
        "success": True,
        "message": "Entrada de lista negra resuelta",
        "entry": entry
    }


# ============================================================================
# DEPENDENCIA PARA VERIFICAR ADMIN
# ============================================================================

def get_current_admin_user(current_user: models.User = Depends(get_current_active_user)):
    """
    Verifica que el usuario actual sea admin.
    Usar en rutas que solo deben ser accesibles por admins.
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador para acceder a este recurso"
        )
    return current_user


# ============================================================================
# RUTAS DE ANALYTICS (Solo Admin)
# ============================================================================

from app.crud import (
    get_analytics_overview,
    get_revenue_timeline,
    get_country_distribution,
    get_peak_hours,
    get_vehicle_types_distribution,
    get_payment_methods_distribution,
    get_average_stay_duration_by_country,
    get_monthly_comparison,
    get_weekday_distribution,
    get_total_nights,                              # ← NUEVO
    get_nights_timeline,                           # ← NUEVO
    get_stay_length_distribution,                  # ← NUEVO
    get_country_distribution_with_nights,           # ← NUEVO
    get_rental_vs_owned_distribution,
    get_country_distribution_with_rentals
)

@app.get("/api/analytics/overview")
async def analytics_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """KPIs principales"""
    return get_analytics_overview(db)


@app.get("/api/analytics/revenue-timeline")
async def analytics_revenue_timeline(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Ingresos diarios"""
    return get_revenue_timeline(db, days)


@app.get("/api/analytics/country-distribution")
async def analytics_country_distribution(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Distribución por países CON pernoctas y alquileres (ingresos reales)"""
    return get_country_distribution_with_rentals(db)


@app.get("/api/analytics/peak-hours")
async def analytics_peak_hours(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Horas pico"""
    return get_peak_hours(db)


@app.get("/api/analytics/vehicle-types")
async def analytics_vehicle_types(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Tipos de vehículos"""
    return get_vehicle_types_distribution(db)


@app.get("/api/analytics/payment-methods")
async def analytics_payment_methods(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Métodos de pago"""
    return get_payment_methods_distribution(db)


@app.get("/api/analytics/stay-duration-by-country")
async def analytics_stay_duration(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Duración promedio por país"""
    return get_average_stay_duration_by_country(db)


@app.get("/api/analytics/monthly-comparison")
async def analytics_monthly_comparison(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Comparación mensual"""
    return get_monthly_comparison(db, months)


@app.get("/api/analytics/weekday-distribution")
async def analytics_weekday_distribution(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Distribución por día de la semana"""
    return get_weekday_distribution(db)

@app.get("/api/analytics/rental-vs-owned")
async def analytics_rental_vs_owned(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Distribución de vehículos propios vs alquiler"""
    return get_rental_vs_owned_distribution(db)
# ============================================================================
# NUEVOS ENDPOINTS PARA PERNOCTAS
# ============================================================================

@app.get("/api/analytics/total-nights")
async def analytics_total_nights(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Total de pernoctas y promedio"""
    return get_total_nights(db)


@app.get("/api/analytics/nights-timeline")
async def analytics_nights_timeline(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Pernoctas por día"""
    return get_nights_timeline(db, days)


@app.get("/api/analytics/stay-length-distribution")
async def analytics_stay_length_distribution(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Distribución de estancias por duración"""
    return get_stay_length_distribution(db)

@app.get("/api/analytics/payment-methods-detailed")
async def analytics_payment_methods_detailed(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Desglose detallado de métodos de pago desde transacciones de caja"""
    
    # Obtener todas las transacciones de caja (CHECKOUT y PREPAYMENT)
    transactions = db.query(models.CashTransaction).filter(
        models.CashTransaction.transaction_type.in_([
            models.TransactionType.CHECKOUT,
            models.TransactionType.PREPAYMENT
        ])
    ).all()
    
    # Calcular totales por método
    cash_total = 0.0
    card_total = 0.0
    transfer_total = 0.0
    
    cash_count = 0
    card_count = 0
    transfer_count = 0
    
    transfer_transactions = []
    card_transactions = []
    
    for tx in transactions:
        amount = tx.amount_paid or 0
        
        if tx.payment_method == models.PaymentMethod.CASH:
            cash_total += amount
            cash_count += 1
            
        elif tx.payment_method == models.PaymentMethod.CARD:
            card_total += amount
            card_count += 1
            
            # Obtener datos del stay
            stay = db.query(models.Stay).filter(models.Stay.id == tx.stay_id).first()
            if stay:
                card_transactions.append({
                    "license_plate": stay.vehicle.license_plate,
                    "country": stay.vehicle.country or "Unknown",
                    "amount": amount,
                    "check_out_time": tx.timestamp.isoformat(),
                    "check_in_time": stay.check_in_time.isoformat() if stay.check_in_time else None
                })
            
        elif tx.payment_method == models.PaymentMethod.TRANSFER:
            transfer_total += amount
            transfer_count += 1
            
            # Obtener datos del stay
            stay = db.query(models.Stay).filter(models.Stay.id == tx.stay_id).first()
            if stay:
                transfer_transactions.append({
                    "license_plate": stay.vehicle.license_plate,
                    "country": stay.vehicle.country or "Unknown",
                    "amount": amount,
                    "check_out_time": tx.timestamp.isoformat(),
                    "check_in_time": stay.check_in_time.isoformat() if stay.check_in_time else None
                })
    
    # Ordenar por fecha
    transfer_transactions.sort(key=lambda x: x["check_out_time"] or "", reverse=True)
    card_transactions.sort(key=lambda x: x["check_out_time"] or "", reverse=True)
    
    return {
        "totals": {
            "cash": {
                "amount": round(cash_total, 2),
                "count": cash_count
            },
            "card": {
                "amount": round(card_total, 2),
                "count": card_count
            },
            "transfer": {
                "amount": round(transfer_total, 2),
                "count": transfer_count
            }
        },
        "transactions": {
            "transfer": transfer_transactions,
            "card": card_transactions
        }
    }

@app.get("/api/analytics/daily-occupancy-average")
async def analytics_daily_occupancy_average(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Ocupación media para el día actual (histórica)"""
    from app.crud import get_daily_occupancy_average
    return get_daily_occupancy_average(db)


@app.get("/api/analytics/occupancy-period")
async def analytics_occupancy_period(
    start_date: str,
    end_date: str,
    country: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Ocupación por período con filtros opcionales"""
    from app.crud import get_occupancy_by_period
    return get_occupancy_by_period(db, start_date, end_date, country)

@app.get("/api/analytics/user-performance")
async def analytics_user_performance(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Rendimiento por usuario con filtros opcionales de fecha"""
    from app.crud import get_user_performance
    return get_user_performance(db, start_date, end_date)