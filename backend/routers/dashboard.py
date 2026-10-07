from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import models, auth
from database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/funnel")
def funnel_stats(
    city: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("city_manager", "business_head", "admin")),
):
    statuses = [
        "interested", "asm_assigned", "visit_scheduled",
        "asm_submitted", "negotiating", "acquired", "closed_lost", "manager_queue"
    ]
    query = db.query(models.Deal.status, func.count(models.Deal.id))

    if city:
        query = query.filter(models.Deal.city == city)
    elif current_user.role == "city_manager" and current_user.city:
        query = query.filter(models.Deal.city == current_user.city)

    results = dict(query.group_by(models.Deal.status).all())
    return {s: results.get(s, 0) for s in statuses}


@router.get("/sla-breaches")
def sla_breaches(
    city: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("city_manager", "business_head", "admin")),
):
    now = datetime.utcnow()
    query = db.query(models.SLATimer).filter(
        models.SLATimer.due_at < now,
        models.SLATimer.breached_at == None,
        models.SLATimer.paused_at == None,
    )
    breaches = query.all()
    return {"total_breaches": len(breaches), "breaches": [
        {"deal_id": b.deal_id, "sla_type": b.sla_type, "due_at": b.due_at, "overdue_hours": round((now - b.due_at).total_seconds() / 3600, 1)}
        for b in breaches
    ]}


@router.get("/asm-load")
def asm_load(
    city: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("city_manager", "admin")),
):
    query = db.query(
        models.User.id,
        models.User.name,
        models.User.city,
        func.count(models.Deal.id).label("open_deals"),
    ).outerjoin(
        models.Deal,
        (models.Deal.asm_id == models.User.id) &
        models.Deal.status.in_(["asm_assigned", "visit_scheduled"])
    ).filter(models.User.role == "asm")

    if city:
        query = query.filter(models.User.city == city)
    elif current_user.role == "city_manager" and current_user.city:
        query = query.filter(models.User.city == current_user.city)

    results = query.group_by(models.User.id).all()
    return [{"id": r.id, "name": r.name, "city": r.city, "open_deals": r.open_deals} for r in results]


@router.get("/aging")
def aging_deals(
    city: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("city_manager", "business_head", "admin")),
):
    now = datetime.utcnow()
    query = db.query(models.Deal).filter(
        models.Deal.status.notin_(["acquired", "closed_lost"])
    )

    if city:
        query = query.filter(models.Deal.city == city)
    elif current_user.role == "city_manager" and current_user.city:
        query = query.filter(models.Deal.city == current_user.city)

    deals = query.all()
    return [{
        "id": d.id,
        "society": d.society,
        "locality": d.locality,
        "status": d.status,
        "days_in_status": round((now - d.updated_at).total_seconds() / 86400, 1),
        "days_since_creation": round((now - d.created_at).total_seconds() / 86400, 1),
    } for d in deals]
