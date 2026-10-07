from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    token = auth.create_access_token({"sub": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        name=payload.name,
        email=payload.email,
        hashed_password=auth.hash_password(payload.password),
        role=payload.role,
        city=payload.city,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
