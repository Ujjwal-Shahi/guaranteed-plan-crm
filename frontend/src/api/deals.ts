import { api } from './client';
import type { Deal, Visit, Offer, Photo, DealEvent, SLATimer } from '../types';

export const dealsApi = {
  list: (params?: { status?: string; city?: string }) =>
    api.get<Deal[]>('/api/deals', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Deal>(`/api/deals/${id}`).then((r) => r.data),

  create: (data: Partial<Deal>) =>
    api.post<Deal>('/api/deals', data).then((r) => r.data),

  assignAsm: (dealId: string, asmId: string) =>
    api.patch<Deal>(`/api/deals/${dealId}/assign-asm`, null, { params: { asm_id: asmId } }).then((r) => r.data),

  getEvents: (dealId: string) =>
    api.get<DealEvent[]>(`/api/deals/${dealId}/events`).then((r) => r.data),

  getSla: (dealId: string) =>
    api.get<SLATimer[]>(`/api/deals/${dealId}/sla`).then((r) => r.data),

  // Visits
  getVisits: (dealId: string) =>
    api.get<Visit[]>(`/api/deals/${dealId}/visits`).then((r) => r.data),

  scheduleVisit: (dealId: string, data: { scheduled_at?: string }) =>
    api.post<Visit>(`/api/deals/${dealId}/visits`, data).then((r) => r.data),

  submitVisitForm: (dealId: string, visitId: string, data: Record<string, unknown>) =>
    api.post<Visit>(`/api/deals/${dealId}/visits/${visitId}/submit`, data).then((r) => r.data),

  // Photos
  getPhotos: (dealId: string) =>
    api.get<Photo[]>(`/api/deals/${dealId}/photos`).then((r) => r.data),

  uploadPhoto: (dealId: string, slot: string, file: File, gps?: { lat: number; lng: number }) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<Photo>(`/api/deals/${dealId}/photos/${slot}`, form, {
      params: gps ? { gps_lat: gps.lat, gps_lng: gps.lng } : {},
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  // Offers
  getOffers: (dealId: string) =>
    api.get<Offer[]>(`/api/deals/${dealId}/offers`).then((r) => r.data),

  createOffer: (dealId: string, data: { amount: number; offer_type: string; note?: string }) =>
    api.post<Offer>(`/api/deals/${dealId}/offers`, data).then((r) => r.data),

  setOutcome: (dealId: string, data: { outcome: string; reason?: string; follow_up_date?: string; acquisition_price?: number }) =>
    api.post<Deal>(`/api/deals/${dealId}/offers/outcome`, data).then((r) => r.data),
};
