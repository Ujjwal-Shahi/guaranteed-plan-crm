from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # agent1, asm, agent2, city_manager, business_head, admin
    city = Column(String)
    available_from = Column(DateTime, nullable=True)
    available_to = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    deals_as_agent1 = relationship("Deal", foreign_keys="Deal.agent1_id", back_populates="agent1")
    deals_as_asm = relationship("Deal", foreign_keys="Deal.asm_id", back_populates="asm")
    deals_as_agent2 = relationship("Deal", foreign_keys="Deal.agent2_id", back_populates="agent2")
    notifications = relationship("Notification", back_populates="user")


class Deal(Base):
    __tablename__ = "deals"

    id = Column(String, primary_key=True, default=gen_uuid)
    seller_name = Column(String, nullable=False)
    seller_phone = Column(String, nullable=False)
    society = Column(String, nullable=False)
    locality = Column(String, nullable=False)
    city = Column(String, nullable=False)
    tower = Column(String)
    flat_number = Column(String, nullable=False)
    bhk = Column(String, nullable=False)  # 1BHK, 2BHK, 3BHK, 4BHK+
    carpet_area = Column(Float)
    occupancy = Column(String)  # self, tenant, vacant
    visit_slots = Column(JSON)  # up to 3 preferred slots
    agent1_notes = Column(Text)
    status = Column(String, nullable=False, default="interested")
    # statuses: interested, asm_assigned, visit_scheduled, asm_submitted,
    #           negotiating, acquired, closed_lost, manager_queue
    agent1_id = Column(String, ForeignKey("users.id"))
    asm_id = Column(String, ForeignKey("users.id"))
    agent2_id = Column(String, ForeignKey("users.id"))
    duplicate_of = Column(String, ForeignKey("deals.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    agent1 = relationship("User", foreign_keys=[agent1_id], back_populates="deals_as_agent1")
    asm = relationship("User", foreign_keys=[asm_id], back_populates="deals_as_asm")
    agent2 = relationship("User", foreign_keys=[agent2_id], back_populates="deals_as_agent2")
    events = relationship("DealEvent", back_populates="deal")
    visits = relationship("Visit", back_populates="deal")
    photos = relationship("Photo", back_populates="deal")
    offers = relationship("Offer", back_populates="deal")
    sla_timers = relationship("SLATimer", back_populates="deal")
    notifications = relationship("Notification", back_populates="deal")


class ASMMapping(Base):
    __tablename__ = "asm_mapping"

    id = Column(String, primary_key=True, default=gen_uuid)
    city = Column(String, nullable=False)
    locality = Column(String, nullable=False)
    society = Column(String, nullable=True)
    primary_asm_id = Column(String, ForeignKey("users.id"))
    backup_asm_id = Column(String, ForeignKey("users.id"), nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    primary_asm = relationship("User", foreign_keys=[primary_asm_id])
    backup_asm = relationship("User", foreign_keys=[backup_asm_id])


class Visit(Base):
    __tablename__ = "visits"

    id = Column(String, primary_key=True, default=gen_uuid)
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    form_json = Column(JSON, nullable=True)
    asm_price = Column(Float, nullable=True)
    confidence = Column(String, nullable=True)  # low, medium, high
    outcome = Column(String, nullable=True)  # suitable, not_suitable
    not_suitable_reason = Column(String, nullable=True)
    sla_paused_at = Column(DateTime, nullable=True)
    sla_pause_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    deal = relationship("Deal", back_populates="visits")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(String, primary_key=True, default=gen_uuid)
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False)
    slot = Column(String, nullable=False)  # exterior, entrance, living_room, kitchen, bedroom_1...
    gcs_path = Column(String, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    taken_at = Column(DateTime, nullable=True)
    uploaded_at = Column(DateTime, nullable=True)
    is_mandatory = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    deal = relationship("Deal", back_populates="photos")


class Offer(Base):
    __tablename__ = "offers"

    id = Column(String, primary_key=True, default=gen_uuid)
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False)
    by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    offer_type = Column(String, nullable=False)  # offer, counter
    note = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    deal = relationship("Deal", back_populates="offers")
    by_user = relationship("User")


class DealEvent(Base):
    __tablename__ = "deal_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False)
    from_status = Column(String)
    to_status = Column(String, nullable=False)
    by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    deal = relationship("Deal", back_populates="events")
    by_user = relationship("User")


class SLATimer(Base):
    __tablename__ = "sla_timers"

    id = Column(String, primary_key=True, default=gen_uuid)
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False)
    sla_type = Column(String, nullable=False)  # schedule_visit, submit_form, first_offer
    due_at = Column(DateTime, nullable=False)
    paused_at = Column(DateTime, nullable=True)
    breached_at = Column(DateTime, nullable=True)
    escalated_to = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    deal = relationship("Deal", back_populates="sla_timers")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    deal_id = Column(String, ForeignKey("deals.id"), nullable=True)
    notification_type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="notifications")
    deal = relationship("Deal", back_populates="notifications")
