from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
import models, schemas, auth
from database import get_db
from notifications import create_notification

router = APIRouter(prefix="/api/deals/{deal_id}/offers", tags=["offers"])


@router.post("", response_model=schemas.OfferOut)
def create_offer(
    deal_id: str,
    payload: schemas.OfferCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("agent2", "admin")),
):
    deal = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Gate: must be asm_submitted or negotiating
    if deal.status not in ("asm_submitted", "negotiating"):
        raise HTTPException(status_code=400, detail="Deal is not ready for offers")

    if deal.status == "asm_submitted":
        deal.status = "negotiating"
        deal.agent2_id = current_user.id
        from routers.deals import log_event
        log_event(deal, "negotiating", current_user.id, None, db)

    offer = models.Offer(
        deal_id=deal_id,
        by_user_id=current_user.id,
        amount=payload.amount,
        offer_type=payload.offer_type,
        note=payload.note,
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


@router.get("", response_model=List[schemas.OfferOut])
def list_offers(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return db.query(models.Offer).options(
        joinedload(models.Offer.by_user)
    ).filter(models.Offer.deal_id == deal_id).order_by(models.Offer.created_at).all()


@router.post("/outcome", response_model=schemas.DealOut)
def set_deal_outcome(
    deal_id: str,
    payload: schemas.DealOutcomeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("agent2", "admin")),
):
    deal = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    from routers.deals import log_event

    if payload.outcome == "accepted":
        deal.status = "acquired"
        log_event(deal, "acquired", current_user.id, f"Acquisition price: {payload.acquisition_price}", db)
        if deal.asm_id:
            create_notification(db, deal.asm_id, deal.id, "deal_acquired",
                                f"Deal acquired at ₹{payload.acquisition_price}: {deal.society}")
    elif payload.outcome == "dropped":
        if not payload.reason:
            raise HTTPException(status_code=400, detail="Reason required when dropping deal")
        deal.status = "closed_lost"
        log_event(deal, "closed_lost", current_user.id, payload.reason, db)
    elif payload.outcome == "on_hold":
        if not payload.follow_up_date:
            raise HTTPException(status_code=400, detail="Follow-up date required for on-hold")
        log_event(deal, "on_hold", current_user.id, f"Follow up: {payload.follow_up_date}", db)

    db.commit()
    db.refresh(deal)
    return deal
