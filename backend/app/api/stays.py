from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo
from app.database import get_db
from app import models, schemas, crud
from app.dependencies import get_current_active_user
from app.crud import (
    get_pending_stays,
    get_active_stays,
    get_stay,
    check_in_stay,
    discard_stay,
    create_manual_stay,
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
    is_rental: bool = Query(False),  # ← AÑADIR
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Actualizar is_rental del vehículo ANTES del check-in
    stay = get_stay(db, stay_id)
    if stay and stay.vehicle:
        stay.vehicle.is_rental = is_rental
        db.commit()
    
    stay = check_in_stay(db, stay_id, spot_type, current_user.id)
    if not stay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stay not found or no available spots of the specified type"
        )
    return stay

# ============================================================================
# ENDPOINT CHECKOUT ACTUALIZADO CON FECHAS EDITABLES
# ============================================================================

@router.post("/{stay_id}/check-out", response_model=schemas.Stay)
async def check_out(
    stay_id: int,
    checkout_data: schemas.CheckoutRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Checkout con fechas editables.
    - check_in_time: Fecha/hora de entrada (si no se especifica, mantiene la actual)
    - check_out_time: Fecha/hora de salida (si no se especifica, usa NOW())
    - final_price: Precio final
    """
    stay = db.query(models.Stay).filter(models.Stay.id == stay_id).first()
    if not stay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stay not found"
        )
    
    # Actualizar fechas (editables)
    if checkout_data.check_in_time:
        stay.check_in_time = checkout_data.check_in_time
    
    if checkout_data.check_out_time:
        stay.check_out_time = checkout_data.check_out_time
    else:
        stay.check_out_time = datetime.now(ZoneInfo("Europe/Madrid"))
    
    # Actualizar precio
    stay.final_price = checkout_data.final_price
    stay.amount_paid = checkout_data.final_price
    stay.status = models.StayStatus.COMPLETED
    
    # ← CORREGIDO: Preservar PREPAID si ya estaba pagado por adelantado
    if stay.payment_status != models.PaymentStatus.PREPAID:
        stay.payment_status = models.PaymentStatus.PAID
    
    stay.cash_registered = False  # Pendiente de registrar en caja
    
    # Liberar plaza
    if stay.parking_spot:
        stay.parking_spot.is_occupied = False
    
    # Log en historial
    history_log = models.HistoryLog(
        stay_id=stay_id,
        action="Check-out completed",
        timestamp=datetime.now(ZoneInfo("Europe/Madrid")),
        details={
            "final_price": checkout_data.final_price,
            "check_in_time": stay.check_in_time.isoformat() if stay.check_in_time else None,
            "check_out_time": stay.check_out_time.isoformat() if stay.check_out_time else None,
            "nights": max(1, (stay.check_out_time.date() - stay.check_in_time.date()).days) if stay.check_in_time and stay.check_out_time else None,
            "payment_status": stay.payment_status.value  # ← AÑADIR para trackear en logs
        },
        user_id=current_user.id
    )
    db.add(history_log)
    
    db.commit()
    db.refresh(stay)
    
    return stay


# ============================================================================
# ENDPOINT PREPAYMENT ACTUALIZADO CON FECHAS EDITABLES Y CHECK-IN IMPLÍCITO
# ============================================================================

@router.post("/{stay_id}/prepay")
async def prepay_stay(
    stay_id: int,
    prepayment_data: schemas.PrepaymentRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Prepayment con check-in implícito y fechas editables.
    - amount: Importe pagado adelantado
    - payment_method: Método de pago (cash/card/transfer)
    - check_in_time: Fecha/hora entrada (si no se especifica, usa NOW())
    - check_out_time: Fecha/hora salida PREVISTA (requerida)
    
    El stay pasará a ACTIVE automáticamente (check-in implícito)
    """
    stay = db.query(models.Stay).filter(models.Stay.id == stay_id).first()
    if not stay:
        raise HTTPException(status_code=404, detail="Stay not found")
    
    # Actualizar fechas
    if prepayment_data.check_in_time:
        stay.check_in_time = prepayment_data.check_in_time
    else:
        stay.check_in_time = datetime.now(ZoneInfo("Europe/Madrid"))
    
    if prepayment_data.check_out_time:
        stay.check_out_time = prepayment_data.check_out_time
    else:
        # Si no se especifica salida, asignar 3 días por defecto
        from datetime import timedelta
        stay.check_out_time = stay.check_in_time + timedelta(days=3)
    
    # Actualizar prepago
    stay.prepaid_amount = prepayment_data.amount
    stay.payment_status = models.PaymentStatus.PREPAID
    stay.payment_method = prepayment_data.payment_method
    stay.prepayment_cash_registered = False  # Pendiente para caja
    
    # CAMBIO CRÍTICO: Pasar a ACTIVE (check-in implícito)
    stay.status = models.StayStatus.ACTIVE
    
    # Crear log en history_logs
    history_log = models.HistoryLog(
        stay_id=stay_id,
        action="Prepayment received (check-in implícito)",
        timestamp=datetime.now(ZoneInfo("Europe/Madrid")),
        details={
            "amount": prepayment_data.amount,
            "payment_method": prepayment_data.payment_method.value,
            "check_in_time": stay.check_in_time.isoformat(),
            "check_out_time_prevista": stay.check_out_time.isoformat(),
            "nights_previstas": max(1, (stay.check_out_time.date() - stay.check_in_time.date()).days)
        },
        user_id=current_user.id
    )
    db.add(history_log)
    
    db.commit()
    db.refresh(stay)
    
    return {
        "success": True,
        "message": "Prepayment recorded and check-in completed",
        "stay_id": stay_id,
        "amount": prepayment_data.amount,
        "check_in_time": stay.check_in_time,
        "check_out_time_prevista": stay.check_out_time,
        "status": stay.status.value
    }


@router.post("/{stay_id}/discard", response_model=schemas.Stay)
async def discard(
    stay_id: int,
    reason: str = Query(..., min_length=1),
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
    license_plate: str = Query(..., min_length=1),
    vehicle_type: str = Query(..., min_length=1),
    spot_type: models.SpotType = Query(...),
    country: str = Query(..., min_length=1),
    is_rental: bool = Query(False),
    check_in_time: str = Query(None),  # ← AÑADIR (ISO format string, opcional)
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Parsear check_in_time si se proporciona
    parsed_check_in_time = None
    if check_in_time:
        try:
            # Intentar parsear como datetime ISO
            parsed_check_in_time = datetime.fromisoformat(check_in_time.replace('Z', '+00:00'))
            # Convertir a timezone Madrid
            parsed_check_in_time = parsed_check_in_time.astimezone(ZoneInfo("Europe/Madrid"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid check_in_time format. Use ISO format (e.g., 2024-11-27T10:30:00)"
            )
    
    stay_data = {
        "license_plate": license_plate,
        "vehicle_type": vehicle_type,
        "spot_type": spot_type,
        "country": country,
        "is_rental": is_rental,
        "check_in_time": parsed_check_in_time  # ← AÑADIR
    }
    stay = create_manual_stay(db, stay_data, current_user.id)
    if not stay:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create manual entry - no available spots of the specified type"
        )
    return stay


# ============================================================================
# ENDPOINT PARA CHECKOUT CON PREPAYMENT (LEGACY - MANTENER POR COMPATIBILIDAD)
# ============================================================================

@router.post("/{stay_id}/checkout-with-prepayment")
async def checkout_with_prepayment(
    stay_id: int,
    final_price: float = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Endpoint legacy para checkout considerando prepago.
    Mantener por compatibilidad con frontend actual.
    """
    stay = db.query(models.Stay).filter(models.Stay.id == stay_id).first()
    if not stay:
        raise HTTPException(status_code=404, detail="Stay not found")
    
    stay.check_out_time = datetime.now(ZoneInfo("Europe/Madrid"))
    stay.final_price = final_price
    stay.status = models.StayStatus.COMPLETED
    stay.payment_status = models.PaymentStatus.PAID
    stay.cash_registered = False
    
    if stay.parking_spot:
        stay.parking_spot.is_occupied = False
    
    history_log = models.HistoryLog(
        stay_id=stay_id,
        action="Check-out completed (with prepayment)",
        timestamp=datetime.now(ZoneInfo("Europe/Madrid")),
        details={"final_price": final_price},
        user_id=current_user.id
    )
    db.add(history_log)
    
    db.commit()
    db.refresh(stay)
    
    return {"success": True, "message": "Checkout completed"}


# ============================================================================
# ENDPOINT PARA PREPAYMENT (LEGACY - MANTENER POR COMPATIBILIDAD)
# ============================================================================

@router.post("/{stay_id}/prepayment")
async def prepayment_legacy(
    stay_id: int,
    amount: float = Query(..., description="Prepaid amount"),
    payment_method: str = Query("cash", description="Payment method"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Endpoint legacy para prepayment sin fechas editables.
    Mantener por compatibilidad con frontend actual.
    Redirige al nuevo endpoint con valores por defecto.
    """
    from datetime import timedelta
    
    # Convertir string a enum
    try:
        payment_method_enum = models.PaymentMethod(payment_method)
    except ValueError:
        payment_method_enum = models.PaymentMethod.CASH  # Default a cash si no es válido
    
    prepayment_data = schemas.PrepaymentRequest(
        amount=amount,
        payment_method=payment_method_enum,
        check_in_time=datetime.now(ZoneInfo("Europe/Madrid")),
        check_out_time=datetime.now(ZoneInfo("Europe/Madrid")) + timedelta(days=3)
    )
    
    return await prepay_stay(stay_id, prepayment_data, db, current_user)

@router.post("/{stay_id}/extend-stay")
async def extend_stay(
    stay_id: int,
    extend_data: schemas.ExtendStayRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Extender estancia para stays con prepayment.
    - Añade noches adicionales
    - Suma importe al prepaid_amount
    - Actualiza check_out_time
    - Registra método de pago de la extensión en history_logs
    """
    stay = db.query(models.Stay).filter(models.Stay.id == stay_id).first()
    if not stay:
        raise HTTPException(status_code=404, detail="Stay not found")
    
    # Verificar que tenga prepayment
    if stay.payment_status != models.PaymentStatus.PREPAID:
        raise HTTPException(
            status_code=400, 
            detail="Solo se pueden extender estancias con pago adelantado"
        )
    
    # Verificar que esté activo
    if stay.status != models.StayStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden extender estancias activas"
        )
    
    # Guardar valores originales
    original_amount = stay.prepaid_amount
    original_checkout = stay.check_out_time
    original_payment_method = stay.payment_method
    
    # Calcular nueva fecha de checkout
    from datetime import timedelta
    if stay.check_out_time:
        new_checkout = stay.check_out_time + timedelta(days=extend_data.nights_to_add)
    else:
        # Si no tenía checkout previsto (raro), usar check_in + días
        new_checkout = stay.check_in_time + timedelta(days=extend_data.nights_to_add)
    
    # Actualizar stay
    stay.prepaid_amount = (stay.prepaid_amount or 0) + extend_data.additional_amount
    stay.check_out_time = new_checkout
    
    # Crear log detallado en history_logs
    history_log = models.HistoryLog(
        stay_id=stay_id,
        action="Estancia extendida",
        timestamp=datetime.now(ZoneInfo("Europe/Madrid")),
        details={
            "nights_added": extend_data.nights_to_add,
            "additional_amount": extend_data.additional_amount,
            "payment_method_extension": extend_data.payment_method.value,
            "original_payment_method": original_payment_method.value if original_payment_method else None,
            "original_prepaid_amount": original_amount,
            "new_total_prepaid_amount": stay.prepaid_amount,
            "original_check_out_time": original_checkout.isoformat() if original_checkout else None,
            "new_check_out_time": new_checkout.isoformat(),
            "note": f"Cliente pagó {original_amount:.2f}€ en {original_payment_method.value if original_payment_method else 'N/A'} + {extend_data.additional_amount:.2f}€ en {extend_data.payment_method.value}"
        },
        user_id=current_user.id
    )
    db.add(history_log)
    
    db.commit()
    db.refresh(stay)
    
    return {
        "success": True,
        "message": "Estancia extendida correctamente",
        "stay_id": stay_id,
        "nights_added": extend_data.nights_to_add,
        "additional_amount": extend_data.additional_amount,
        "new_total_amount": stay.prepaid_amount,
        "new_check_out_time": stay.check_out_time,
        "payment_methods_used": {
            "original": original_payment_method.value if original_payment_method else None,
            "extension": extend_data.payment_method.value
        }
    }

@router.get("/history/{license_plate}")
async def get_customer_history_endpoint(  # ← CAMBIA EL NOMBRE
    license_plate: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Obtiene el historial de un cliente por matrícula.
    Útil para identificar clientes habituales y sus estadísticas.
    """
    history = crud.get_customer_history(db, license_plate)  # ← Añade crud.
    return history

@router.delete("/{stay_id}/checkout")
async def delete_checkout(
    stay_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Elimina un checkout del historial.
    - Marca el stay como DISCARDED
    - Libera la plaza de parking
    - Elimina la transacción de caja asociada (si existe)
    - Registra la acción en history_logs
    """
    stay = db.query(models.Stay).filter(models.Stay.id == stay_id).first()
    
    if not stay:
        raise HTTPException(status_code=404, detail="Stay not found")
    
    # Verificar que esté completado
    if stay.status != models.StayStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden eliminar checkouts de stays completados"
        )
    
    # Guardar info para el log
    license_plate = stay.vehicle.license_plate if stay.vehicle else "Unknown"
    final_price = stay.final_price
    check_out_time = stay.check_out_time
    
    # 1. MARCAR STAY COMO DISCARDED
    stay.status = models.StayStatus.DISCARDED
    stay.cash_registered = False
    
    # 2. LIBERAR PLAZA DE PARKING
    if stay.parking_spot:
        spot = db.query(models.ParkingSpot).filter(
            models.ParkingSpot.id == stay.parking_spot_id
        ).first()
        if spot:
            spot.is_occupied = False
    
    # 3. ELIMINAR TRANSACCIÓN DE CAJA (si existe)
    cash_transaction = db.query(models.CashTransaction).filter(
        and_(
            models.CashTransaction.stay_id == stay_id,
            models.CashTransaction.transaction_type == models.TransactionType.CHECKOUT
        )
    ).first()
    
    if cash_transaction:
        db.delete(cash_transaction)
    
    # 4. CREAR LOG EN HISTORY
    history_log = models.HistoryLog(
        stay_id=stay_id,
        action="Checkout eliminado manualmente",
        timestamp=datetime.now(ZoneInfo("Europe/Madrid")),
        details={
            "license_plate": license_plate,
            "original_final_price": final_price,
            "original_check_out_time": check_out_time.isoformat() if check_out_time else None,
            "deleted_by": current_user.username,
            "reason": "Eliminación manual desde History"
        },
        user_id=current_user.id
    )
    db.add(history_log)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Checkout eliminado correctamente para {license_plate}",
        "stay_id": stay_id,
        "deleted_by": current_user.username
    }

@router.get("/recent-checkouts")
async def get_recent_checkouts_endpoint(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Obtiene los checkouts más recientes.
    Útil para el modal de eliminación de checkouts.
    """
    checkouts = crud.get_recent_checkouts(db, limit)
    return checkouts


@router.delete("/{stay_id}/active")
async def delete_active_stay(
    stay_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Elimina una estancia activa (solo si está en estado PENDING de pago).
    - Marca el stay como DISCARDED
    - Libera la plaza de parking
    - Registra la acción en history_logs
    """
    stay = db.query(models.Stay).filter(models.Stay.id == stay_id).first()
    
    if not stay:
        raise HTTPException(status_code=404, detail="Stay not found")
    
    # Verificar que esté activo
    if stay.status != models.StayStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden eliminar estancias activas"
        )
    
    # Verificar que NO tenga pago adelantado
    if stay.payment_status == models.PaymentStatus.PREPAID:
        raise HTTPException(
            status_code=400,
            detail="No se pueden eliminar estancias con pago adelantado"
        )
    
    # Guardar info para el log
    license_plate = stay.vehicle.license_plate if stay.vehicle else "Unknown"
    spot_number = stay.parking_spot.spot_number if stay.parking_spot else "N/A"
    check_in_time = stay.check_in_time
    
    # 1. MARCAR STAY COMO DISCARDED
    stay.status = models.StayStatus.DISCARDED
    
    # 2. LIBERAR PLAZA DE PARKING
    if stay.parking_spot:
        spot = db.query(models.ParkingSpot).filter(
            models.ParkingSpot.id == stay.parking_spot_id
        ).first()
        if spot:
            spot.is_occupied = False
    
    # 3. CREAR LOG EN HISTORY
    history_log = models.HistoryLog(
        stay_id=stay_id,
        action="Estancia activa eliminada manualmente",
        timestamp=datetime.now(ZoneInfo("Europe/Madrid")),
        details={
            "license_plate": license_plate,
            "spot_number": spot_number,
            "check_in_time": check_in_time.isoformat() if check_in_time else None,
            "deleted_by": current_user.username,
            "reason": "Eliminación manual desde Active Stays (error operario)"
        },
        user_id=current_user.id
    )
    db.add(history_log)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Estancia eliminada correctamente para {license_plate}",
        "stay_id": stay_id,
        "deleted_by": current_user.username
    }