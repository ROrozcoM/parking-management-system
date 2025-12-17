from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from typing import List
from app.database import get_db
from app import models, schemas, crud
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/cash", tags=["cash"])

# Esquema para venta de productos
class ProductSaleRequest(BaseModel):
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    quantity: int = 1
    unit_price: Optional[float] = None
    payment_method: models.PaymentMethod = models.PaymentMethod.CASH

@router.get("/active-session", response_model=schemas.CashSessionSummary)
async def get_active_session(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Obtiene la sesión de caja activa con su resumen"""
    session = crud.get_active_cash_session(db)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay sesión de caja activa"
        )
    
    summary = crud.get_cash_session_summary(db, session.id)
    return summary

@router.get("/pre-close-info", response_model=schemas.CashSessionPreCloseInfo)
async def get_pre_close_info_endpoint(
    suggested_change: float = 300.0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Obtiene información ANTES de cerrar caja:
    - Esperado por método (cash/card/transfer)
    - Sugerencias de retiro
    - Transacciones pendientes
    """
    # Obtener sesión activa
    session = crud.get_active_cash_session(db)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay sesión de caja activa"
        )
    
    # Obtener info
    info = crud.get_pre_close_info(db, session.id, suggested_change)
    
    if not info:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al calcular información de cierre"
        )
    
    return info


@router.post("/open-session", response_model=schemas.CashSessionResponse)
async def open_session(
    session_data: schemas.CashSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Abre una nueva sesión de caja"""
    try:
        session = crud.open_cash_session(db, session_data.initial_amount, current_user.id)
        return session
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/close-session/{session_id}", response_model=schemas.CashSessionResponse)
async def close_session(
    session_id: int,
    close_data: schemas.CashSessionCloseWithBreakdown,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Cierra una sesión de caja con desglose completo de billetes y métodos.
    Envía email automático al cerrar.
    """
    try:
        session = crud.close_cash_session_with_breakdown(
            db=db,
            session_id=session_id,
            cash_breakdown=close_data.cash_breakdown,
            actual_cash=close_data.actual_cash,
            actual_card=close_data.actual_card,
            actual_transfer=close_data.actual_transfer,
            actual_withdrawal=close_data.actual_withdrawal,
            remaining_in_register=close_data.remaining_in_register,
            notes=close_data.notes,
            user_id=current_user.id
        )
        return session
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Si falla el email, seguir con el cierre
        print(f"⚠️ Error en cierre: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cerrar caja: {str(e)}"
        )
    

@router.get("/pending-transactions", response_model=schemas.PendingTransactionsList)
async def get_pending_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Obtiene todas las transacciones pendientes de registrar"""
    return crud.get_pending_transactions(db)


@router.post("/register-pending/{stay_id}", response_model=schemas.CashTransactionResponse)
async def register_pending(
    stay_id: int,
    transaction_data: schemas.RegisterPendingTransaction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Registra una transacción pendiente en caja"""
    try:
        transaction = crud.register_pending_transaction(
            db,
            stay_id,
            transaction_data.payment_method.value,
            transaction_data.amount_paid,
            current_user.id
        )
        
        # Obtener datos adicionales para la respuesta
        license_plate = None
        if transaction.stay_id:
            stay = crud.get_stay(db, transaction.stay_id)
            if stay:
                license_plate = stay.vehicle.license_plate
        
        user = db.query(models.User).filter(models.User.id == transaction.user_id).first()
        username = user.username if user else "Unknown"
        
        # Construir respuesta
        response = {
            "id": transaction.id,
            "cash_session_id": transaction.cash_session_id,
            "timestamp": transaction.timestamp,
            "transaction_type": transaction.transaction_type,
            "stay_id": transaction.stay_id,
            "amount_due": transaction.amount_due,
            "amount_paid": transaction.amount_paid,
            "change_given": transaction.change_given,
            "payment_method": transaction.payment_method,
            "user_id": transaction.user_id,
            "notes": transaction.notes,
            "license_plate": license_plate,
            "username": username
        }
        
        return response
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/withdrawal", response_model=schemas.CashTransactionResponse)
async def register_withdrawal(
    withdrawal_data: schemas.WithdrawalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Registra un retiro de caja (solo admin)"""
    # Verificar que es admin
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden realizar retiros"
        )
    
    session = crud.get_active_cash_session(db)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay sesión de caja activa"
        )
    
    try:
        transaction = crud.register_withdrawal(
            db,
            session.id,
            withdrawal_data.amount,
            withdrawal_data.notes,
            current_user.id
        )
        
        user = db.query(models.User).filter(models.User.id == transaction.user_id).first()
        username = user.username if user else "Unknown"
        
        response = {
            "id": transaction.id,
            "cash_session_id": transaction.cash_session_id,
            "timestamp": transaction.timestamp,
            "transaction_type": transaction.transaction_type,
            "stay_id": transaction.stay_id,
            "amount_due": transaction.amount_due,
            "amount_paid": transaction.amount_paid,
            "change_given": transaction.change_given,
            "payment_method": transaction.payment_method,
            "user_id": transaction.user_id,
            "notes": transaction.notes,
            "license_plate": None,
            "username": username
        }
        
        return response
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/transactions/{session_id}", response_model=List[schemas.CashTransactionResponse])
async def get_transactions(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Obtiene todas las transacciones de una sesión"""
    transactions = crud.get_cash_transactions(db, session_id)
    return transactions


@router.get("/session/{session_id}", response_model=schemas.CashSessionResponse)
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Obtiene los detalles de una sesión específica"""
    session = db.query(models.CashSession).filter(
        models.CashSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )
    
    return session


@router.delete("/transaction/{transaction_id}")
async def undo_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Deshace/elimina una transacción de caja (solo si la caja sigue abierta)"""
    
    # Obtener la transacción
    transaction = db.query(models.CashTransaction).filter(
        models.CashTransaction.id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transacción no encontrada"
        )
    
    # Verificar que la caja sigue abierta
    session = db.query(models.CashSession).filter(
        models.CashSession.id == transaction.cash_session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión de caja no encontrada"
        )
    
    if session.status == models.CashSessionStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede deshacer transacciones de una caja cerrada"
        )
    
    # Si la transacción está asociada a un stay, desmarcarlo como registrado
    if transaction.stay_id:
        stay = db.query(models.Stay).filter(
            models.Stay.id == transaction.stay_id
        ).first()
        
        if stay:
            # Determinar qué tipo de transacción es y desmarcar apropiadamente
            if transaction.transaction_type == models.TransactionType.PREPAYMENT:
                stay.prepayment_cash_registered = False
            elif transaction.transaction_type == models.TransactionType.CHECKOUT:
                stay.cash_registered = False
                stay.payment_method = None
                stay.amount_paid = None
                stay.change_given = None
    
    # Eliminar la transacción
    db.delete(transaction)
    db.commit()
    
    return {
        "success": True,
        "message": "Transacción eliminada correctamente"
    }




@router.post("/product-sale")
async def register_product_sale(
    sale_data: ProductSaleRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Registra una venta de producto.
    - Si product_id: usa producto del catálogo
    - Si product_name + unit_price: venta de "Otro" producto
    - TODAS las ventas se registran directamente en caja (efectivo, tarjeta, transferencia)
    """
    from datetime import datetime
    from zoneinfo import ZoneInfo
    
    # Validaciones
    if sale_data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cantidad debe ser mayor a 0"
        )
    
    # Determinar producto y precio
    product = None
    final_product_name = None
    final_unit_price = None
    
    if sale_data.product_id:
        # Producto del catálogo
        product = db.query(models.Product).filter(
            models.Product.id == sale_data.product_id,
            models.Product.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado o inactivo"
            )
        
        # Si viene unit_price del frontend, usar ese (precio editado)
        # Si no, usar el del catálogo
        final_product_name = sale_data.product_name if sale_data.product_name else product.name
        final_unit_price = sale_data.unit_price if sale_data.unit_price else product.price
        
    elif sale_data.product_name and sale_data.unit_price:
        # Producto "Otro" con precio manual
        if sale_data.unit_price <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El precio debe ser mayor a 0"
            )
        
        final_product_name = sale_data.product_name.strip()
        final_unit_price = sale_data.unit_price
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar product_id O (product_name + unit_price)"
        )
    
    # Calcular total
    total_amount = final_unit_price * sale_data.quantity
    
    # Verificar que hay caja abierta
    active_session = db.query(models.CashSession).filter(
        models.CashSession.status == models.CashSessionStatus.OPEN
    ).first()
    
    if not active_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay caja abierta. Por favor, abre la caja antes de registrar ventas."
        )
    
    # Registrar transacción (SIEMPRE directo a caja)
    transaction = models.CashTransaction(
        cash_session_id=active_session.id,
        transaction_type=models.TransactionType.PRODUCT_SALE,
        product_id=product.id if product else None,
        product_name=final_product_name,
        amount_due=total_amount,
        amount_paid=total_amount,
        change_given=0,
        payment_method=sale_data.payment_method,
        user_id=current_user.id,
        timestamp=datetime.now(ZoneInfo("Europe/Madrid")),
        notes=f"{sale_data.quantity}x {final_product_name} @ {final_unit_price:.2f}€"
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return {
        "success": True,
        "message": "Venta registrada en caja correctamente",
        "transaction_id": transaction.id,
        "product_name": final_product_name,
        "quantity": sale_data.quantity,
        "unit_price": final_unit_price,
        "total_amount": total_amount,
        "payment_method": sale_data.payment_method.value
    }