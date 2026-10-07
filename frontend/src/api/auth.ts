import { api } from './client';
import type { User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; token_type: string; user: User }>(
      '/api/auth/login',
      new URLSearchParams({ username: email, password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ).then((r) => r.data),

  me: () => api.get<User>('/api/auth/me').then((r) => r.data),
};
