from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    city: Optional[str] = None


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    city: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class DealCreate(BaseModel):
    seller_name: str
    seller_phone: str
    society: str
    locality: str
    city: str
    tower: Optional[str] = None
    flat_number: str
    bhk: str
    carpet_area: Optional[float] = None
    occupancy: Optional[str] = None  # self, tenant, vacant
    visit_slots: Optional[List[str]] = []
    agent1_notes: Optional[str] = None


class DealOut(BaseModel):
    id: str
    seller_name: str
    seller_phone: str
    society: str
    locality: str
    city: str
    tower: Optional[str]
    flat_number: str
    bhk: str
    carpet_area: Optional[float]
    occupancy: Optional[str]
    visit_slots: Optional[List[str]]
    agent1_notes: Optional[str]
    status: str
    agent1_id: Optional[str]
    asm_id: Optional[str]
    agent2_id: Optional[str]
    duplicate_of: Optional[str]
    created_at: datetime
    updated_at: datetime
    agent1: Optional[UserOut] = None
    asm: Optional[UserOut] = None
    agent2: Optional[UserOut] = None

    class Config:
        from_attributes = True


class DealStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None


class ASMMappingCreate(BaseModel):
    city: str
    locality: str
    society: Optional[str] = None
    primary_asm_id: str
    backup_asm_id: Optional[str] = None


class ASMMappingOut(BaseModel):
    id: str
    city: str
    locality: str
    society: Optional[str]
    primary_asm_id: str
    backup_asm_id: Optional[str]
    active: bool
    primary_asm: Optional[UserOut] = None
    backup_asm: Optional[UserOut] = None

    class Config:
        from_attributes = True


class VisitCreate(BaseModel):
    scheduled_at: Optional[datetime] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None


class VisitFormSubmit(BaseModel):
    # Condition section (P0)
    condition_overall_rating: Optional[int] = None  # 1-5
    condition_issues: Optional[List[str]] = []  # seepage, cracks, wiring, plumbing, fittings, paint
    condition_refurb_bucket: Optional[str] = None  # under_50k, 50k_2l, over_2l
    condition_photos: Optional[List[str]] = []

    # Furnishing section (P0)
    furnishing_status: Optional[str] = None  # furnished, semi, unfurnished
    furnishing_items_staying: Optional[List[str]] = []

    # Seller intent section (P0)
    seller_reason: Optional[str] = None
    seller_urgency: Optional[str] = None  # immediate, 1_month, 3_months, flexible
    seller_expected_price: Optional[float] = None
    seller_hinted_floor: Optional[str] = None
    seller_other_brokers: Optional[bool] = None
    seller_other_offers: Optional[bool] = None
    seller_decision_makers: Optional[str] = None
    seller_vacating_timeline: Optional[str] = None

    # Documents seen (P0)
    doc_title_in_seller_name: Optional[str] = None  # seen, not_seen, unknown
    doc_khata_type: Optional[str] = None  # A, B, unknown
    doc_oc_cc: Optional[str] = None  # seen, not_seen, unknown
    doc_property_tax_paid: Optional[str] = None
    doc_loan_outstanding: Optional[str] = None
    doc_society_noc: Optional[str] = None

    # Building and society (P1)
    water_source: Optional[str] = None
    parking: Optional[str] = None
    lifts: Optional[str] = None
    power_backup: Optional[str] = None
    maintenance_per_month: Optional[float] = None
    pending_dues: Optional[bool] = None
    amenities_working: Optional[List[str]] = []

    # Unit specifics (P1)
    floor_number: Optional[int] = None
    facing: Optional[str] = None
    view: Optional[str] = None
    light_ventilation: Optional[str] = None
    noise_level: Optional[str] = None

    # ASM verdict (P0)
    asm_price: float
    asm_confidence: str  # low, medium, high
    comparable_listings: Optional[str] = None
    comparables_sales: Optional[str] = None
    top_positives: Optional[List[str]] = []
    top_negatives: Optional[List[str]] = []

    # Outcome (P0)
    outcome: str  # suitable, not_suitable
    not_suitable_reason: Optional[str] = None  # condition, legal, price_expectation, seller_withdrew

    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None


class VisitOut(BaseModel):
    id: str
    deal_id: str
    scheduled_at: Optional[datetime]
    submitted_at: Optional[datetime]
    gps_lat: Optional[float]
    gps_lng: Optional[float]
    form_json: Optional[Any]
    asm_price: Optional[float]
    confidence: Optional[str]
    outcome: Optional[str]
    not_suitable_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class OfferCreate(BaseModel):
    amount: float
    offer_type: str  # offer, counter
    note: Optional[str] = None


class OfferOut(BaseModel):
    id: str
    deal_id: str
    by_user_id: str
    amount: float
    offer_type: str
    note: Optional[str]
    created_at: datetime
    by_user: Optional[UserOut] = None

    class Config:
        from_attributes = True


class DealOutcomeUpdate(BaseModel):
    outcome: str  # accepted, dropped, on_hold
    reason: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    acquisition_price: Optional[float] = None


class PhotoSlotOut(BaseModel):
    id: str
    deal_id: str
    slot: str
    gcs_path: Optional[str]
    uploaded_at: Optional[datetime]
    is_mandatory: bool

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: str
    deal_id: Optional[str]
    notification_type: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DealEventOut(BaseModel):
    id: str
    deal_id: str
    from_status: Optional[str]
    to_status: str
    by_user_id: str
    reason: Optional[str]
    created_at: datetime
    by_user: Optional[UserOut] = None

    class Config:
        from_attributes = True


class SLATimerOut(BaseModel):
    id: str
    deal_id: str
    sla_type: str
    due_at: datetime
    paused_at: Optional[datetime]
    breached_at: Optional[datetime]
    escalated_to: Optional[str]

    class Config:
        from_attributes = True


class UserAvailabilityUpdate(BaseModel):
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None
    is_active: Optional[bool] = None
