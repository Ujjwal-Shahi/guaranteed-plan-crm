from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import models, schemas, auth
from database import get_db
import os, base64

router = APIRouter(prefix="/api/deals/{deal_id}/photos", tags=["photos"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/gp_photos")


@router.get("", response_model=List[schemas.PhotoSlotOut])
def list_photos(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return db.query(models.Photo).filter(models.Photo.deal_id == deal_id).all()


@router.post("/{slot}", response_model=schemas.PhotoSlotOut)
async def upload_photo(
    deal_id: str,
    slot: str,
    file: UploadFile = File(...),
    gps_lat: float = None,
    gps_lng: float = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("asm", "agent2", "admin")),
):
    deal = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    os.makedirs(f"{UPLOAD_DIR}/{deal_id}", exist_ok=True)
    filename = f"{slot}_{int(datetime.utcnow().timestamp())}.jpg"
    file_path = f"{UPLOAD_DIR}/{deal_id}/{filename}"

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # In production this would upload to GCS and return a signed URL
    gcs_path = f"uploads/{deal_id}/{filename}"

    photo = db.query(models.Photo).filter(
        models.Photo.deal_id == deal_id,
        models.Photo.slot == slot,
    ).first()

    if photo:
        photo.gcs_path = gcs_path
        photo.gps_lat = gps_lat
        photo.gps_lng = gps_lng
        photo.uploaded_at = datetime.utcnow()
    else:
        photo = models.Photo(
            deal_id=deal_id,
            slot=slot,
            gcs_path=gcs_path,
            gps_lat=gps_lat,
            gps_lng=gps_lng,
            taken_at=datetime.utcnow(),
            uploaded_at=datetime.utcnow(),
            is_mandatory=False,
        )
        db.add(photo)

    db.commit()
    db.refresh(photo)
    return photo


@router.get("/download-zip")
def download_zip_info(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("agent2", "admin")),
):
    photos = db.query(models.Photo).filter(
        models.Photo.deal_id == deal_id,
        models.Photo.gcs_path != None,
    ).all()
    return {
        "deal_id": deal_id,
        "photo_count": len(photos),
        "slots": [p.slot for p in photos],
        "download_url": f"/api/deals/{deal_id}/photos/zip",
    }
