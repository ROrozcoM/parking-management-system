from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/history", tags=["history"])

@router.get("/", response_model=List[dict])
async def history_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    days: Optional[int] = Query(30, description="Days to look back (default 30)"),
    action_filter: Optional[str] = Query(None, description="Filter by action type"),
    start_date: Optional[datetime] = Query(None, description="Custom start date"),
    end_date: Optional[datetime] = Query(None, description="Custom end date"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get history logs with filters:
    - days: 30, 90, 365 (or custom)
    - action_filter: 'check-in', 'check-out', 'discard', 'manual', 'blacklist'
    - start_date / end_date: custom date range
    """
    
    # Base query with JOINs
    query = db.query(
        models.HistoryLog.id,
        models.HistoryLog.action,
        models.HistoryLog.timestamp,
        models.HistoryLog.details,
        models.Stay.id.label('stay_id'),
        models.Vehicle.license_plate,
        models.Vehicle.vehicle_type,
        models.Vehicle.country,
        models.User.username
    ).join(
        models.Stay, models.HistoryLog.stay_id == models.Stay.id
    ).join(
        models.Vehicle, models.Stay.vehicle_id == models.Vehicle.id
    ).outerjoin(
        models.User, models.HistoryLog.user_id == models.User.id
    )
    
    # Date filtering
    if start_date and end_date:
        # Custom date range
        query = query.filter(
            and_(
                models.HistoryLog.timestamp >= start_date,
                models.HistoryLog.timestamp <= end_date
            )
        )
    elif days:
        # Last N days
        cutoff_date = datetime.now() - timedelta(days=days)
        query = query.filter(models.HistoryLog.timestamp >= cutoff_date)
    
    # Action filtering
    if action_filter:
        action_map = {
            'check-in': '%check-in%',
            'check-out': '%check-out%',
            'discard': '%discard%',
            'manual': '%manual%',
            'blacklist': '%blacklist%'
        }
        pattern = action_map.get(action_filter.lower(), f'%{action_filter}%')
        query = query.filter(models.HistoryLog.action.ilike(pattern))
    
    # Order by timestamp DESC (most recent first)
    query = query.order_by(desc(models.HistoryLog.timestamp))
    
    # Pagination
    query = query.offset(skip).limit(limit)
    
    # Execute and format results
    results = query.all()
    
    return [
        {
            "id": row.id,
            "action": row.action,
            "timestamp": row.timestamp,
            "details": row.details,
            "stay_id": row.stay_id,
            "license_plate": row.license_plate,
            "vehicle_type": row.vehicle_type,
            "country": row.country,
            "username": row.username
        }
        for row in results
    ]


@router.get("/stats/")
async def history_stats(
    days: int = Query(30, description="Days to calculate stats"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get statistics for history logs"""
    
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Count by action type
    action_counts = db.query(
        models.HistoryLog.action,
        func.count(models.HistoryLog.id).label('count')
    ).filter(
        models.HistoryLog.timestamp >= cutoff_date
    ).group_by(
        models.HistoryLog.action
    ).all()
    
    # Total revenue from check-outs
    revenue = db.query(
        func.sum(models.Stay.final_price)
    ).join(
        models.HistoryLog, models.Stay.id == models.HistoryLog.stay_id
    ).filter(
        and_(
            models.HistoryLog.timestamp >= cutoff_date,
            models.HistoryLog.action.ilike('%check-out%'),
            models.Stay.final_price.isnot(None)
        )
    ).scalar() or 0
    
    return {
        "period_days": days,
        "action_counts": {row.action: row.count for row in action_counts},
        "total_revenue": float(revenue),
        "total_events": sum(row.count for row in action_counts)
    }