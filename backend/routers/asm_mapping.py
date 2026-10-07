from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/asm-mapping", tags=["asm-mapping"])


@router.post("", response_model=schemas.ASMMappingOut)
def create_mapping(
    payload: schemas.ASMMappingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("city_manager", "admin")),
):
    existing = db.query(models.ASMMapping).filter(
        models.ASMMapping.city == payload.city,
        models.ASMMapping.locality == payload.locality,
        models.ASMMapping.society == payload.society,
        models.ASMMapping.active == True,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mapping already exists for this locality")

    mapping = models.ASMMapping(**payload.model_dump())
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.get("", response_model=List[schemas.ASMMappingOut])
def list_mappings(
    city: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("city_manager", "admin", "business_head")),
):
    query = db.query(models.ASMMapping).options(
        joinedload(models.ASMMapping.primary_asm),
        joinedload(models.ASMMapping.backup_asm),
    ).filter(models.ASMMapping.active == True)

    if city:
        query = query.filter(models.ASMMapping.city == city)
    elif current_user.role == "city_manager" and current_user.city:
        query = query.filter(models.ASMMapping.city == current_user.city)

    return query.all()


@router.patch("/{mapping_id}", response_model=schemas.ASMMappingOut)
def update_mapping(
    mapping_id: str,
    payload: schemas.ASMMappingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("city_manager", "admin")),
):
    mapping = db.query(models.ASMMapping).filter(models.ASMMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    for k, v in payload.model_dump().items():
        setattr(mapping, k, v)

    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/{mapping_id}")
def delete_mapping(
    mapping_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin")),
):
    mapping = db.query(models.ASMMapping).filter(models.ASMMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    mapping.active = False
    db.commit()
    return {"status": "deactivated"}
