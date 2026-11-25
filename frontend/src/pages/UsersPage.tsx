import { useState, useEffect } from 'react';
import { usersApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

const ROLE_LABELS: Record<string, string> = {
  agent1: 'Agent 1', asm: 'ASM', agent2: 'Agent 2',
  city_manager: 'City Manager', business_head: 'Business Head', admin: 'Admin',
};

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.list({ role: roleFilter || undefined, city: user?.role === 'city_manager' ? user.city || undefined : undefined })
      .then(setUsers).finally(() => setLoading(false));
  }, [roleFilter, user]);

  const ROLES = ['', 'agent1', 'asm', 'agent2', 'city_manager', 'business_head', 'admin'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#003335' }}>Users</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {ROLES.map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              style={{ padding: '5px 12px', border: '1px solid', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                borderColor: roleFilter === r ? '#003335' : '#ddd',
                background: roleFilter === r ? '#003335' : '#fff',
                color: roleFilter === r ? '#fff' : '#555',
              }}>
              {r ? ROLE_LABELS[r] : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8f9ff' }}>
                {['Name', 'Email', 'Role', 'City', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#999' }}>No users found.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.name}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, background: '#e0f5f6', color: '#003335', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{u.city || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, background: u.is_active ? '#e8f5e9' : '#ffebee', color: u.is_active ? '#2e7d32' : '#c62828', padding: '2px 10px', borderRadius: 12 }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
