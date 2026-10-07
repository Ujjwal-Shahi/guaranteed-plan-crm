from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[schemas.UserOut])
def list_users(
    role: str = None,
    city: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("city_manager", "admin", "business_head")),
):
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    if city:
        query = query.filter(models.User.city == city)
    elif current_user.role == "city_manager" and current_user.city:
        query = query.filter(models.User.city == current_user.city)
    return query.order_by(models.User.name).all()


@router.patch("/{user_id}/availability", response_model=schemas.UserOut)
def update_availability(
    user_id: str,
    payload: schemas.UserAvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.id != user_id and current_user.role not in ("admin", "city_manager"):
        raise HTTPException(status_code=403, detail="Cannot update another user's availability")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.available_from is not None:
        user.available_from = payload.available_from
    if payload.available_to is not None:
        user.available_to = payload.available_to
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user


@router.get("/asm/load", response_model=List[dict])
def get_asm_load(
    city: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("city_manager", "admin")),
):
    """Return each ASM's open visit count for load balancing."""
    from sqlalchemy import func
    query = db.query(
        models.User.id,
        models.User.name,
        models.User.city,
        func.count(models.Deal.id).label("open_deals"),
    ).outerjoin(
        models.Deal,
        (models.Deal.asm_id == models.User.id) &
        (models.Deal.status.in_(["asm_assigned", "visit_scheduled"])),
    ).filter(models.User.role == "asm")

    if city:
        query = query.filter(models.User.city == city)
    elif current_user.role == "city_manager" and current_user.city:
        query = query.filter(models.User.city == current_user.city)

    results = query.group_by(models.User.id).all()
    return [{"id": r.id, "name": r.name, "city": r.city, "open_deals": r.open_deals} for r in results]
