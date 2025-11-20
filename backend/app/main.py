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


@app.post("/api/print-ticket")
async def print_ticket_endpoint(
    ticket_type: str,
    license_plate: str,
    check_in_time: str,
    amount: float,
    check_out_time: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user)
):
    """Imprime un ticket"""
    result = print_ticket(ticket_type, license_plate, check_in_time, amount, check_out_time)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    return result


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
    get_weekday_distribution
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
    """Distribución por países"""
    return get_country_distribution(db)


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