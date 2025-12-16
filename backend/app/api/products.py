from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo

from app import models, schemas
from app.database import get_db
from app.api.auth import get_current_active_user

router = APIRouter(prefix="/products", tags=["products"])


@router.get("")
async def get_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    include_inactive: bool = False
):
    """
    Obtiene la lista de productos.
    Por defecto solo muestra productos activos.
    """
    query = db.query(models.Product)
    
    if not include_inactive:
        query = query.filter(models.Product.is_active == True)
    
    products = query.order_by(models.Product.name).all()
    
    return {
        "count": len(products),
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "price": p.price,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None
            }
            for p in products
        ]
    }


@router.post("")
async def create_product(
    name: str,
    price: float,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Crea un nuevo producto en el catálogo.
    """
    if price <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El precio debe ser mayor a 0"
        )
    
    # Verificar si ya existe un producto con ese nombre
    existing = db.query(models.Product).filter(
        models.Product.name.ilike(name.strip())
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un producto con el nombre '{name}'"
        )
    
    product = models.Product(
        name=name.strip(),
        price=price,
        is_active=True
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return {
        "success": True,
        "message": "Producto creado correctamente",
        "product": {
            "id": product.id,
            "name": product.name,
            "price": product.price
        }
    }


@router.put("/{product_id}")
async def update_product(
    product_id: int,
    name: str = None,
    price: float = None,
    is_active: bool = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Actualiza un producto existente.
    """
    product = db.query(models.Product).filter(
        models.Product.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    
    if name is not None:
        product.name = name.strip()
    
    if price is not None:
        if price <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El precio debe ser mayor a 0"
            )
        product.price = price
    
    if is_active is not None:
        product.is_active = is_active
    
    product.updated_at = datetime.now(ZoneInfo("Europe/Madrid"))
    
    db.commit()
    db.refresh(product)
    
    return {
        "success": True,
        "message": "Producto actualizado correctamente",
        "product": {
            "id": product.id,
            "name": product.name,
            "price": product.price,
            "is_active": product.is_active
        }
    }