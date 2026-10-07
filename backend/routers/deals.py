from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
import models, schemas, auth
from database import get_db
from notifications import create_notification

router = APIRouter(prefix="/api/deals", tags=["deals"])

BHK_PHOTO_SLOTS = {
    "1BHK": ["exterior", "entrance", "living_room", "kitchen", "bedroom_1", "bathroom_1", "balcony", "society_amenity"],
    "2BHK": ["exterior", "entrance", "living_room", "kitchen", "bedroom_1", "bedroom_2", "bathroom_1", "bathroom_2", "balcony", "society_amenity"],
    "3BHK": ["exterior", "entrance", "living_room", "kitchen", "bedroom_1", "bedroom_2", "bedroom_3", "bathroom_1", "bathroom_2", "balcony", "society_amenity"],
    "4BHK+": ["exterior", "entrance", "living_room", "kitchen", "bedroom_1", "bedroom_2", "bedroom_3", "bedroom_4", "bathroom_1", "bathroom_2", "balcony", "society_amenity"],
}

SLA_HOURS = {
    "schedule_visit": 24,
    "submit_form": 48,
    "first_offer": 24,
}


def assign_asm(deal: models.Deal, db: Session) -> Optional[models.User]:
    mapping = db.query(models.ASMMapping).filter(
        models.ASMMapping.city == deal.city,
        models.ASMMapping.locality == deal.locality,
        models.ASMMapping.active == True,
    ).first()

    if not mapping:
        mapping = db.query(models.ASMMapping).filter(
            models.ASMMapping.city == deal.city,
            models.ASMMapping.locality == deal.locality,
            models.ASMMapping.active == True,
        ).first()

    if not mapping:
        return None

    primary = db.query(models.User).filter(models.User.id == mapping.primary_asm_id).first()
    if primary and primary.is_active and (not primary.available_to or primary.available_to < datetime.utcnow()):
        return primary

    if mapping.backup_asm_id:
        backup = db.query(models.User).filter(models.User.id == mapping.backup_asm_id).first()
        if backup and backup.is_active:
            return backup

    return None


def create_sla_timer(deal_id: str, sla_type: str, db: Session):
    hours = SLA_HOURS.get(sla_type, 24)
    timer = models.SLATimer(
        deal_id=deal_id,
        sla_type=sla_type,
        due_at=datetime.utcnow() + timedelta(hours=hours),
    )
    db.add(timer)


def log_event(deal: models.Deal, to_status: str, by_user_id: str, reason: Optional[str], db: Session):
    event = models.DealEvent(
        deal_id=deal.id,
        from_status=deal.status,
        to_status=to_status,
        by_user_id=by_user_id,
        reason=reason,
    )
    db.add(event)


@router.post("", response_model=schemas.DealOut)
def create_deal(
    payload: schemas.DealCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("agent1", "admin")),
):
    # Duplicate check: same phone + society + flat
    existing = db.query(models.Deal).filter(
        models.Deal.seller_phone == payload.seller_phone,
        models.Deal.society == payload.society,
        models.Deal.flat_number == payload.flat_number,
    ).first()

    deal = models.Deal(
        seller_name=payload.seller_name,
        seller_phone=payload.seller_phone,
        society=payload.society,
        locality=payload.locality,
        city=payload.city,
        tower=payload.tower,
        flat_number=payload.flat_number,
        bhk=payload.bhk,
        carpet_area=payload.carpet_area,
        occupancy=payload.occupancy,
        visit_slots=payload.visit_slots,
        agent1_notes=payload.agent1_notes,
        status="interested",
        agent1_id=current_user.id,
        duplicate_of=existing.id if existing else None,
    )
    db.add(deal)
    db.flush()

    # Create mandatory photo slots
    slots = BHK_PHOTO_SLOTS.get(payload.bhk, BHK_PHOTO_SLOTS["2BHK"])
    for slot in slots:
        photo = models.Photo(deal_id=deal.id, slot=slot, is_mandatory=True)
        db.add(photo)

    # Auto-assign ASM
    asm = assign_asm(deal, db)
    if asm:
        deal.asm_id = asm.id
        deal.status = "asm_assigned"
        log_event(deal, "asm_assigned", current_user.id, "Auto-assigned by locality mapping", db)
        create_sla_timer(deal.id, "schedule_visit", db)
        create_notification(db, asm.id, deal.id, "new_assignment", f"New deal assigned: {deal.society}, {deal.locality}")
    else:
        deal.status = "manager_queue"
        log_event(deal, "manager_queue", current_user.id, "Unmapped locality", db)
        # Notify city managers
        managers = db.query(models.User).filter(
            models.User.role == "city_manager",
            models.User.city == deal.city,
        ).all()
        for mgr in managers:
            create_notification(db, mgr.id, deal.id, "manager_queue", f"Unassigned deal needs ASM: {deal.society}, {deal.locality}")

    db.commit()
    db.refresh(deal)
    return deal


@router.get("", response_model=List[schemas.DealOut])
def list_deals(
    status: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = db.query(models.Deal).options(
        joinedload(models.Deal.agent1),
        joinedload(models.Deal.asm),
        joinedload(models.Deal.agent2),
    )

    if current_user.role == "agent1":
        query = query.filter(models.Deal.agent1_id == current_user.id)
    elif current_user.role == "asm":
        query = query.filter(models.Deal.asm_id == current_user.id)
    elif current_user.role == "agent2":
        # Gate: only see ASM-submitted or later deals
        query = query.filter(models.Deal.status.in_(["asm_submitted", "negotiating", "acquired", "closed_lost"]))
    elif current_user.role == "city_manager":
        if current_user.city:
            query = query.filter(models.Deal.city == current_user.city)
    # business_head and admin see all

    if status:
        query = query.filter(models.Deal.status == status)
    if city and current_user.role in ("business_head", "admin"):
        query = query.filter(models.Deal.city == city)

    return query.order_by(models.Deal.created_at.desc()).all()


@router.get("/{deal_id}", response_model=schemas.DealOut)
def get_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    deal = db.query(models.Deal).options(
        joinedload(models.Deal.agent1),
        joinedload(models.Deal.asm),
        joinedload(models.Deal.agent2),
    ).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Agent 2 gate
    if current_user.role == "agent2" and deal.status in ("interested", "asm_assigned", "visit_scheduled", "manager_queue"):
        raise HTTPException(status_code=403, detail="ASM visit not yet submitted")

    return deal


@router.patch("/{deal_id}/assign-asm", response_model=schemas.DealOut)
def assign_asm_manually(
    deal_id: str,
    asm_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("city_manager", "admin")),
):
    deal = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    asm = db.query(models.User).filter(models.User.id == asm_id, models.User.role == "asm").first()
    if not asm:
        raise HTTPException(status_code=404, detail="ASM not found")

    old_asm_id = deal.asm_id
    deal.asm_id = asm_id
    deal.status = "asm_assigned"
    log_event(deal, "asm_assigned", current_user.id, f"Manually assigned by manager", db)
    create_sla_timer(deal.id, "schedule_visit", db)
    create_notification(db, asm_id, deal.id, "new_assignment", f"Deal assigned to you: {deal.society}, {deal.locality}")

    if old_asm_id and old_asm_id != asm_id:
        create_notification(db, old_asm_id, deal.id, "deal_reassigned", f"Deal reassigned from you: {deal.society}")

    db.commit()
    db.refresh(deal)
    return deal


@router.get("/{deal_id}/events", response_model=List[schemas.DealEventOut])
def get_deal_events(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return db.query(models.DealEvent).options(
        joinedload(models.DealEvent.by_user)
    ).filter(models.DealEvent.deal_id == deal_id).order_by(models.DealEvent.created_at).all()


@router.get("/{deal_id}/sla", response_model=List[schemas.SLATimerOut])
def get_deal_sla(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return db.query(models.SLATimer).filter(models.SLATimer.deal_id == deal_id).all()
