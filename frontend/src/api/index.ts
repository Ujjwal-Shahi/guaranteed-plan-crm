import { api } from './client';
import type { Notification, ASMMapping, User } from '../types';

export { dealsApi } from './deals';
export { authApi } from './auth';

export const notificationsApi = {
  list: (unreadOnly = false) =>
    api.get<Notification[]>('/api/notifications', { params: { unread_only: unreadOnly } }).then((r) => r.data),
  markRead: (id: string) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
};

export const asmMappingApi = {
  list: (city?: string) =>
    api.get<ASMMapping[]>('/api/asm-mapping', { params: { city } }).then((r) => r.data),
  create: (data: Partial<ASMMapping>) =>
    api.post<ASMMapping>('/api/asm-mapping', data).then((r) => r.data),
  update: (id: string, data: Partial<ASMMapping>) =>
    api.patch<ASMMapping>(`/api/asm-mapping/${id}`, data).then((r) => r.data),
};

export const usersApi = {
  list: (params?: { role?: string; city?: string }) =>
    api.get<User[]>('/api/users', { params }).then((r) => r.data),
  asmLoad: (city?: string) =>
    api.get<{ id: string; name: string; city: string; open_deals: number }[]>(
      '/api/users/asm/load', { params: { city } }
    ).then((r) => r.data),
};

export const dashboardApi = {
  funnel: (city?: string) =>
    api.get<Record<string, number>>('/api/dashboard/funnel', { params: { city } }).then((r) => r.data),
  slaBreaches: (city?: string) =>
    api.get<{ total_breaches: number; breaches: unknown[] }>('/api/dashboard/sla-breaches', { params: { city } }).then((r) => r.data),
  asmLoad: (city?: string) =>
    api.get<{ id: string; name: string; city: string; open_deals: number }[]>('/api/dashboard/asm-load', { params: { city } }).then((r) => r.data),
  aging: (city?: string) =>
    api.get<unknown[]>('/api/dashboard/aging', { params: { city } }).then((r) => r.data),
};
