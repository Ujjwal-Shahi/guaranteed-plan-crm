"""
Seed demo deals across all pipeline stages via direct DB manipulation.
Run after seed.py: python seed_deals.py
"""
import os, sys, uuid
from datetime import datetime, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite:///./data/guaranteed_plan.db")
os.environ.setdefault("SECRET_KEY", "change-me-in-production")
os.environ.setdefault("UPLOAD_DIR", "./data/photos")

from database import SessionLocal, engine, Base
import models, auth
from notifications import create_notification

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── helpers ──────────────────────────────────────────────────────────────────

def get_user(role: str, email: str = None):
    q = db.query(models.User).filter(models.User.role == role)
    if email:
        q = q.filter(models.User.email == email)
    return q.first()

def log(deal, to_status, by_user_id, reason=""):
    ev = models.DealEvent(
        id=str(uuid.uuid4()), deal_id=deal.id,
        from_status=deal.status, to_status=to_status,
        by_user_id=by_user_id, reason=reason,
        created_at=datetime.utcnow(),
    )
    db.add(ev)

def sla(deal_id, sla_type, hours_ago=0):
    due = datetime.utcnow() + timedelta(hours=24) - timedelta(hours=hours_ago)
    t = models.SLATimer(
        id=str(uuid.uuid4()), deal_id=deal_id, sla_type=sla_type,
        created_at=datetime.utcnow() - timedelta(hours=hours_ago),
        due_at=due,
    )
    db.add(t)
    return t

def make_deal(seller_name, phone, society, locality, city, flat, bhk,
              agent1, visit_slots=None, notes=None):
    d = models.Deal(
        id=str(uuid.uuid4()),
        seller_name=seller_name, seller_phone=phone,
        society=society, locality=locality, city=city,
        flat_number=flat, bhk=bhk,
        agent1_id=agent1.id, status="interested",
        visit_slots=visit_slots or [],
        agent1_notes=notes,
        created_at=datetime.utcnow(),
    )
    db.add(d)
    log(d, "interested", agent1.id, "Lead created")
    return d

def assign_asm(deal, asm, by_id):
    deal.asm_id = asm.id
    deal.status = "asm_assigned"
    log(deal, "asm_assigned", by_id, "ASM assigned")
    sla(deal.id, "schedule_visit")

def schedule_visit(deal, asm):
    deal.status = "visit_scheduled"
    log(deal, "visit_scheduled", asm.id, "Visit scheduled")
    v = models.Visit(
        id=str(uuid.uuid4()), deal_id=deal.id,
        scheduled_at=datetime.utcnow() + timedelta(days=1),
    )
    db.add(v)
    sla(deal.id, "submit_form")
    return v

def submit_form(deal, visit, asm, price, confidence="high", outcome="suitable"):
    form = {
        "condition_overall_rating": 4,
        "condition_issues": ["paint"],
        "condition_refurb_bucket": "under_5l",
        "furnishing_status": "semi",
        "furnishing_items_staying": ["wardrobes", "fans"],
        "seller_reason": "Upgrading to larger home",
        "seller_urgency": "1_month",
        "seller_expected_price": price * 1.08,
        "seller_other_brokers": False,
        "seller_decision_makers": "Owner + spouse",
        "doc_title_in_seller_name": "seen",
        "doc_khata_type": "seen",
        "doc_oc_cc": "seen",
        "doc_property_tax_paid": "seen",
        "doc_loan_outstanding": "not_seen",
        "asm_price": price,
        "asm_confidence": confidence,
        "top_positives": ["Good natural light", "Close to metro", "New building"],
        "top_negatives": ["Top floor, no lift", "Small kitchen"],
        "outcome": outcome,
        "not_suitable_reason": "" if outcome == "suitable" else "price_expectation",
    }
    visit.form_json = form
    visit.asm_price = price
    visit.confidence = confidence
    visit.outcome = outcome
    visit.submitted_at = datetime.utcnow()
    deal.status = "asm_submitted"
    log(deal, "asm_submitted", asm.id, "Visit form submitted")
    sla(deal.id, "first_offer")

    # seed mandatory photos as uploaded
    bhk_slots = {
        "1BHK": ["exterior","entrance","living_room","kitchen","bedroom_1","bathroom_1","balcony","society_amenity"],
        "2BHK": ["exterior","entrance","living_room","kitchen","bedroom_1","bedroom_2","bathroom_1","bathroom_2","balcony","society_amenity"],
        "3BHK": ["exterior","entrance","living_room","kitchen","bedroom_1","bedroom_2","bedroom_3","bathroom_1","bathroom_2","balcony","society_amenity"],
    }
    for slot in bhk_slots.get(deal.bhk, bhk_slots["2BHK"]):
        p = models.Photo(
            id=str(uuid.uuid4()), deal_id=deal.id, slot=slot,
            gcs_path=f"uploads/{deal.id}/{slot}.jpg",
            uploaded_at=datetime.utcnow(),
            taken_at=datetime.utcnow(), is_mandatory=True,
        )
        db.add(p)

def make_offer(deal, agent2, amount, offer_type="initial"):
    o = models.Offer(
        id=str(uuid.uuid4()), deal_id=deal.id, by_user_id=agent2.id,
        amount=amount, offer_type=offer_type,
    )
    db.add(o)
    if deal.status == "asm_submitted":
        deal.status = "negotiating"
        log(deal, "negotiating", agent2.id, "First offer made")
    return o

def close_deal(deal, agent2, outcome):
    deal.status = outcome
    log(deal, outcome, agent2.id, "Deal closed")

# ── fetch users ───────────────────────────────────────────────────────────────

a1    = get_user("agent1")
asm   = get_user("asm", "asm@demo.com")
asm2  = get_user("asm", "asm2@demo.com")
a2    = get_user("agent2")
mgr   = get_user("city_manager")

print(f"Users: agent1={a1.name}, asm={asm.name}, asm2={asm2.name}, agent2={a2.name}, mgr={mgr.name}")

slots_next_week = [
    (datetime.utcnow() + timedelta(days=2)).isoformat(),
    (datetime.utcnow() + timedelta(days=3)).isoformat(),
]

# ─────────────────────────────────────────────────────────────────────────────
# 1. INTERESTED — fresh leads, not yet assigned
# ─────────────────────────────────────────────────────────────────────────────
d_int1 = make_deal("Ramesh Verma", "9812300001",
    "Prestige Lakeside", "Whitefield", "Bangalore", "B-404", "3BHK",
    a1, slots_next_week, "Owner upgrading, motivated seller")

d_int2 = make_deal("Sunita Iyer", "9812300002",
    "Brigade Gateway", "Rajajinagar", "Bangalore", "12A", "2BHK",
    a1, notes="Seller needs quick sale, loan outstanding")

# ─────────────────────────────────────────────────────────────────────────────
# 2. MANAGER QUEUE — unmapped locality, needs manual assignment
# ─────────────────────────────────────────────────────────────────────────────
d_mq1 = make_deal("Harish Patel", "9812300003",
    "Sobha Dream", "JP Nagar", "Bangalore", "C-201", "2BHK", a1)
d_mq1.status = "manager_queue"
log(d_mq1, "manager_queue", a1.id, "No ASM mapping for locality")

d_mq2 = make_deal("Divya Sharma", "9812300004",
    "Mantri Espana", "Banashankari", "Bangalore", "7", "3BHK", a1)
d_mq2.status = "manager_queue"
log(d_mq2, "manager_queue", a1.id, "No ASM mapping for locality")

# ─────────────────────────────────────────────────────────────────────────────
# 3. ASM ASSIGNED — ASM notified, visit not yet scheduled
# ─────────────────────────────────────────────────────────────────────────────
d_aa1 = make_deal("Vijay Nair", "9812300005",
    "Purva Panorama", "Koramangala", "Bangalore", "501", "2BHK",
    a1, slots_next_week)
assign_asm(d_aa1, asm, mgr.id)

d_aa2 = make_deal("Meena Krishnan", "9812300006",
    "Embassy Springs", "Indiranagar", "Bangalore", "G-12", "1BHK", a1)
assign_asm(d_aa2, asm2, mgr.id)

# ─────────────────────────────────────────────────────────────────────────────
# 4. VISIT SCHEDULED — ASM confirmed slot
# ─────────────────────────────────────────────────────────────────────────────
d_vs1 = make_deal("Anand Hegde", "9812300007",
    "Salarpuria Sattva", "Whitefield", "Bangalore", "1102", "3BHK",
    a1, slots_next_week)
assign_asm(d_vs1, asm, mgr.id)
schedule_visit(d_vs1, asm)

d_vs2 = make_deal("Preethi Rao", "9812300008",
    "Godrej Woodland", "Electronic City", "Bangalore", "B-204", "2BHK", a1)
assign_asm(d_vs2, asm2, mgr.id)
schedule_visit(d_vs2, asm2)

# ─────────────────────────────────────────────────────────────────────────────
# 5. ASM SUBMITTED — visit done, waiting for Agent 2 offer
# ─────────────────────────────────────────────────────────────────────────────
d_sub1 = make_deal("Lakshmi Reddy", "9812300009",
    "Prestige Tech Park", "Marathahalli", "Bangalore", "304", "2BHK",
    a1, slots_next_week, "Very motivated seller")
assign_asm(d_sub1, asm, mgr.id)
v_sub1 = schedule_visit(d_sub1, asm)
submit_form(d_sub1, v_sub1, asm, price=8_500_000, confidence="high")

d_sub2 = make_deal("Kiran Bhat", "9812300010",
    "Adarsh Palm Retreat", "Bellandur", "Bangalore", "A-1001", "3BHK",
    a1, slots_next_week)
assign_asm(d_sub2, asm2, mgr.id)
v_sub2 = schedule_visit(d_sub2, asm2)
submit_form(d_sub2, v_sub2, asm2, price=12_200_000, confidence="medium")

# ─────────────────────────────────────────────────────────────────────────────
# 6. NEGOTIATING — offers in flight
# ─────────────────────────────────────────────────────────────────────────────
d_neg1 = make_deal("Srinivas Murthy", "9812300011",
    "Brigade Meadows", "Kanakapura Road", "Bangalore", "B-505", "2BHK",
    a1, notes="Price sensitive, wants quick close")
assign_asm(d_neg1, asm, mgr.id)
v_neg1 = schedule_visit(d_neg1, asm)
submit_form(d_neg1, v_neg1, asm, price=7_800_000, confidence="high")
make_offer(d_neg1, a2, 7_500_000, "initial")
make_offer(d_neg1, a2, 7_600_000, "revised")

d_neg2 = make_deal("Usha Venkatesh", "9812300012",
    "Sobha Silicon Oasis", "Hosa Road", "Bangalore", "C-301", "3BHK", a1)
assign_asm(d_neg2, asm2, mgr.id)
v_neg2 = schedule_visit(d_neg2, asm2)
submit_form(d_neg2, v_neg2, asm2, price=13_500_000, confidence="medium")
make_offer(d_neg2, a2, 12_800_000, "initial")

# ─────────────────────────────────────────────────────────────────────────────
# 7. ACQUIRED — closed successfully
# ─────────────────────────────────────────────────────────────────────────────
d_acq1 = make_deal("Raghavendra Rao", "9812300013",
    "Prestige Shantiniketan", "Whitefield", "Bangalore", "702", "3BHK",
    a1, notes="Premium property, strong location")
assign_asm(d_acq1, asm, mgr.id)
v_acq1 = schedule_visit(d_acq1, asm)
submit_form(d_acq1, v_acq1, asm, price=18_500_000, confidence="high")
make_offer(d_acq1, a2, 17_800_000, "initial")
make_offer(d_acq1, a2, 18_000_000, "final")
close_deal(d_acq1, a2, "acquired")
# note: Offer model has no outcome/final_price column — deal status carries the close

d_acq2 = make_deal("Kavitha Suresh", "9812300014",
    "Purva East Face", "Indiranagar", "Bangalore", "1A", "2BHK", a1)
assign_asm(d_acq2, asm2, mgr.id)
v_acq2 = schedule_visit(d_acq2, asm2)
submit_form(d_acq2, v_acq2, asm2, price=9_200_000, confidence="high")
make_offer(d_acq2, a2, 8_900_000, "initial")
close_deal(d_acq2, a2, "acquired")

# ─────────────────────────────────────────────────────────────────────────────
# 8. CLOSED LOST — did not close
# ─────────────────────────────────────────────────────────────────────────────
d_lost1 = make_deal("Mohan Das", "9812300015",
    "Mantri Serenity", "Kanakapura Road", "Bangalore", "404", "2BHK",
    a1, notes="Seller had unrealistic price expectations")
assign_asm(d_lost1, asm, mgr.id)
v_lost1 = schedule_visit(d_lost1, asm)
submit_form(d_lost1, v_lost1, asm, price=6_800_000, confidence="low",
            outcome="not_suitable")
make_offer(d_lost1, a2, 6_200_000, "initial")
close_deal(d_lost1, a2, "closed_lost")

d_lost2 = make_deal("Anitha Pillai", "9812300016",
    "Godrej Air", "Hosa Road", "Bangalore", "B-1102", "3BHK", a1)
assign_asm(d_lost2, asm2, mgr.id)
v_lost2 = schedule_visit(d_lost2, asm2)
submit_form(d_lost2, v_lost2, asm2, price=14_000_000, confidence="low")
make_offer(d_lost2, a2, 13_000_000, "initial")
close_deal(d_lost2, a2, "closed_lost")

# ─────────────────────────────────────────────────────────────────────────────
# 9. SLA BREACHED deal (visit scheduled but overdue)
# ─────────────────────────────────────────────────────────────────────────────
d_breach = make_deal("Old Lead Sharma", "9812300017",
    "Old Society", "Koramangala", "Bangalore", "99", "2BHK", a1)
assign_asm(d_breach, asm, mgr.id)
d_breach.status = "visit_scheduled"
log(d_breach, "visit_scheduled", asm.id, "Visit scheduled (overdue)")
v_breach = models.Visit(
    id=str(uuid.uuid4()), deal_id=d_breach.id,
    scheduled_at=datetime.utcnow() - timedelta(days=3),
)
db.add(v_breach)
# SLA already breached
t_breach = models.SLATimer(
    id=str(uuid.uuid4()), deal_id=d_breach.id, sla_type="submit_form",
    created_at=datetime.utcnow() - timedelta(hours=60),
    due_at=datetime.utcnow() - timedelta(hours=12),
    breached_at=datetime.utcnow() - timedelta(hours=12),
)
db.add(t_breach)

# ─────────────────────────────────────────────────────────────────────────────
db.commit()
db.close()

print("\nDemo deals seeded:")
print("  2 × Interested")
print("  2 × Manager Queue (unmapped locality)")
print("  2 × ASM Assigned")
print("  2 × Visit Scheduled")
print("  2 × ASM Submitted")
print("  2 × Negotiating")
print("  2 × Acquired")
print("  2 × Closed Lost")
print("  1 × SLA Breached")
print("\nTotal: 17 demo deals across all pipeline stages.")
