export type UserRole = 'agent1' | 'asm' | 'agent2' | 'city_manager' | 'business_head' | 'admin';

export type DealStatus =
  | 'interested'
  | 'asm_assigned'
  | 'visit_scheduled'
  | 'asm_submitted'
  | 'negotiating'
  | 'acquired'
  | 'closed_lost'
  | 'manager_queue';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  city: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Deal {
  id: string;
  seller_name: string;
  seller_phone: string;
  society: string;
  locality: string;
  city: string;
  tower: string | null;
  flat_number: string;
  bhk: string;
  carpet_area: number | null;
  occupancy: string | null;
  visit_slots: string[];
  agent1_notes: string | null;
  status: DealStatus;
  agent1_id: string | null;
  asm_id: string | null;
  agent2_id: string | null;
  duplicate_of: string | null;
  expected_price_bucket: string | null;
  created_at: string;
  updated_at: string;
  agent1?: User;
  asm?: User;
  agent2?: User;
}

export interface Visit {
  id: string;
  deal_id: string;
  scheduled_at: string | null;
  submitted_at: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  form_json: Record<string, unknown> | null;
  asm_price: number | null;
  confidence: string | null;
  outcome: string | null;
  not_suitable_reason: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  deal_id: string;
  by_user_id: string;
  amount: number;
  offer_type: string;
  note: string | null;
  created_at: string;
  by_user?: User;
}

export interface Photo {
  id: string;
  deal_id: string;
  slot: string;
  gcs_path: string | null;
  uploaded_at: string | null;
  is_mandatory: boolean;
}

export interface DealEvent {
  id: string;
  deal_id: string;
  from_status: string | null;
  to_status: string;
  by_user_id: string;
  reason: string | null;
  created_at: string;
  by_user?: User;
}

export interface SLATimer {
  id: string;
  deal_id: string;
  sla_type: string;
  due_at: string;
  paused_at: string | null;
  breached_at: string | null;
  escalated_to: string | null;
}

export interface Notification {
  id: string;
  deal_id: string | null;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ASMMapping {
  id: string;
  city: string;
  locality: string;
  society: string | null;
  primary_asm_id: string;
  backup_asm_id: string | null;
  active: boolean;
  primary_asm?: User;
  backup_asm?: User;
}
