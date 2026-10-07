from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import models, schemas, auth
from database import get_db
from notifications import create_notification

router = APIRouter(prefix="/api/deals/{deal_id}/visits", tags=["visits"])


def get_deal_or_404(deal_id: str, db: Session) -> models.Deal:
    deal = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal


@router.post("", response_model=schemas.VisitOut)
def schedule_visit(
    deal_id: str,
    payload: schemas.VisitCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("asm", "admin")),
):
    deal = get_deal_or_404(deal_id, db)
    if deal.asm_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not assigned to this deal")
    if deal.status not in ("asm_assigned", "visit_scheduled"):
        raise HTTPException(status_code=400, detail=f"Cannot schedule visit in status '{deal.status}'")

    visit = models.Visit(
        deal_id=deal_id,
        scheduled_at=payload.scheduled_at,
        gps_lat=payload.gps_lat,
        gps_lng=payload.gps_lng,
    )
    db.add(visit)

    from routers.deals import log_event
    deal.status = "visit_scheduled"
    log_event(deal, "visit_scheduled", current_user.id, None, db)

    # Notify Agent 1
    if deal.agent1_id:
        create_notification(db, deal.agent1_id, deal.id, "visit_scheduled",
                            f"ASM scheduled visit for {deal.society}: {payload.scheduled_at}")

    db.commit()
    db.refresh(visit)
    return visit


@router.get("", response_model=List[schemas.VisitOut])
def list_visits(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return db.query(models.Visit).filter(models.Visit.deal_id == deal_id).all()


@router.post("/{visit_id}/submit", response_model=schemas.VisitOut)
def submit_visit_form(
    deal_id: str,
    visit_id: str,
    payload: schemas.VisitFormSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("asm", "admin")),
):
    deal = get_deal_or_404(deal_id, db)
    if deal.asm_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not assigned to this deal")

    visit = db.query(models.Visit).filter(
        models.Visit.id == visit_id,
        models.Visit.deal_id == deal_id,
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    # Check mandatory photos are uploaded
    mandatory_photos = db.query(models.Photo).filter(
        models.Photo.deal_id == deal_id,
        models.Photo.is_mandatory == True,
    ).all()
    missing = [p.slot for p in mandatory_photos if not p.gcs_path]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing mandatory photos: {', '.join(missing)}"
        )

    visit.form_json = payload.model_dump()
    visit.submitted_at = datetime.utcnow()
    visit.asm_price = payload.asm_price
    visit.confidence = payload.asm_confidence
    visit.outcome = payload.outcome
    visit.not_suitable_reason = payload.not_suitable_reason
    visit.gps_lat = payload.gps_lat
    visit.gps_lng = payload.gps_lng

    from routers.deals import log_event, create_sla_timer

    if payload.outcome == "not_suitable":
        deal.status = "closed_lost"
        log_event(deal, "closed_lost", current_user.id, payload.not_suitable_reason, db)
    else:
        deal.status = "asm_submitted"
        log_event(deal, "asm_submitted", current_user.id, None, db)
        create_sla_timer(deal.id, "first_offer", db)

        # Notify Agent 2 users in same city
        agent2_users = db.query(models.User).filter(
            models.User.role == "agent2",
            models.User.city == deal.city,
        ).all()
        for a2 in agent2_users:
            create_notification(db, a2.id, deal.id, "asm_submitted",
                                f"ASM visit submitted, deal ready for offer: {deal.society}")

    db.commit()
    db.refresh(visit)
    return visit


@router.patch("/{visit_id}/pause-sla", response_model=schemas.VisitOut)
def pause_sla(
    deal_id: str,
    visit_id: str,
    reason: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("asm", "admin")),
):
    visit = db.query(models.Visit).filter(
        models.Visit.id == visit_id, models.Visit.deal_id == deal_id
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    visit.sla_paused_at = datetime.utcnow()
    visit.sla_pause_reason = reason

    # Pause active SLA timers
    timers = db.query(models.SLATimer).filter(
        models.SLATimer.deal_id == deal_id,
        models.SLATimer.paused_at == None,
    ).all()
    for t in timers:
        t.paused_at = datetime.utcnow()

    db.commit()
    db.refresh(visit)
    return visit
