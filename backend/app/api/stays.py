from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
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
    final_price: float = Query(..., gt=0),
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    stay_data = {
        "license_plate": license_plate,
        "vehicle_type": vehicle_type,
        "spot_type": spot_type,
        "country": country
    }
    stay = create_manual_stay(db, stay_data, current_user.id)
    if not stay:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create manual entry - no available spots of the specified type"
        )
    return stay

@router.post("/{stay_id}/prepay/")
async def prepay_stay(
    stay_id: int,
    amount: float = Query(..., description="Prepaid amount"),
    payment_method: str = Query("cash", description="Payment method"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    stay = db.query(models.Stay).filter(models.Stay.id == stay_id).first()
    if not stay:
        raise HTTPException(status_code=404, detail="Stay not found")
    
    # Actualizar prepago
    stay.prepaid_amount = amount
    stay.payment_status = models.PaymentStatus.PREPAID
    stay.prepayment_cash_registered = False  # ← NUEVO: Marca como pendiente para caja
    
    # Crear log en history_logs
    history_log = models.HistoryLog(
        stay_id=stay_id,
        action="Prepayment received",
        timestamp=datetime.now(ZoneInfo("Europe/Madrid")),
        details={
            "amount": amount, 
            "payment_method": payment_method,
            "prepaid_at": datetime.now(ZoneInfo("Europe/Madrid")).isoformat()
        },
        user_id=current_user.id
    )
    db.add(history_log)
    
    db.commit()
    db.refresh(stay)
    
    return {
        "success": True,
        "message": "Prepayment recorded", 
        "stay_id": stay_id, 
        "amount": amount
    }