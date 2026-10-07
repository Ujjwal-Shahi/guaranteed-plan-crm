"""Seed script to create demo users, ASM mappings and a sample deal."""

from database import SessionLocal, engine
import models
from auth import hash_password
from datetime import datetime

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

users = [
    {"name": "Arjun Singh", "email": "agent1@demo.com", "password": "demo1234", "role": "agent1", "city": "Bangalore"},
    {"name": "Priya Nair", "email": "asm@demo.com", "password": "demo1234", "role": "asm", "city": "Bangalore"},
    {"name": "Rahul Mehta", "email": "agent2@demo.com", "password": "demo1234", "role": "agent2", "city": "Bangalore"},
    {"name": "Sunita Rao", "email": "manager@demo.com", "password": "demo1234", "role": "city_manager", "city": "Bangalore"},
    {"name": "Vikram Gupta", "email": "bhead@demo.com", "password": "demo1234", "role": "business_head", "city": None},
    {"name": "Admin User", "email": "admin@demo.com", "password": "demo1234", "role": "admin", "city": None},
    {"name": "Kavya ASM", "email": "asm2@demo.com", "password": "demo1234", "role": "asm", "city": "Bangalore"},
]

created_users = {}
for u in users:
    existing = db.query(models.User).filter(models.User.email == u["email"]).first()
    if not existing:
        user = models.User(
            name=u["name"],
            email=u["email"],
            hashed_password=hash_password(u["password"]),
            role=u["role"],
            city=u["city"],
        )
        db.add(user)
        db.flush()
        created_users[u["email"]] = user
    else:
        created_users[u["email"]] = existing

db.commit()

asm_user = created_users.get("asm@demo.com")
asm2_user = created_users.get("asm2@demo.com")

mappings = [
    {"city": "Bangalore", "locality": "Koramangala", "primary_asm_id": asm_user.id if asm_user else None, "backup_asm_id": asm2_user.id if asm2_user else None},
    {"city": "Bangalore", "locality": "Whitefield", "primary_asm_id": asm2_user.id if asm2_user else None},
    {"city": "Bangalore", "locality": "HSR Layout", "primary_asm_id": asm_user.id if asm_user else None},
]

for m in mappings:
    if not m.get("primary_asm_id"):
        continue
    existing = db.query(models.ASMMapping).filter(
        models.ASMMapping.city == m["city"],
        models.ASMMapping.locality == m["locality"],
    ).first()
    if not existing:
        mapping = models.ASMMapping(**m)
        db.add(mapping)

db.commit()
print("Seed complete.")
print("\nDemo accounts:")
for u in users:
    print(f"  {u['role']:15} {u['email']}  /  {u['password']}")
