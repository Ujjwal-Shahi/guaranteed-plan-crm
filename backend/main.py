from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models
from routers import auth, deals, visits, offers, photos, asm_mapping, users, notifications, dashboard

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Guaranteed Plan CRM",
    description="Deal flow CRM for NoBroker Guaranteed Plan",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(deals.router)
app.include_router(visits.router)
app.include_router(offers.router)
app.include_router(photos.router)
app.include_router(asm_mapping.router)
app.include_router(users.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
