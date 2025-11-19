from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user
from app.crud import get_dashboard_data

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/data", response_model=schemas.DashboardData)
async def dashboard_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return get_dashboard_data(db)