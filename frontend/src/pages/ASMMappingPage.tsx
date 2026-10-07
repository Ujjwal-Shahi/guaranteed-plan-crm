import { useState, useEffect } from 'react';
import { asmMappingApi, usersApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { ASMMapping, User } from '../types';

export default function ASMMappingPage() {
  const { user } = useAuth();
  const [mappings, setMappings] = useState<ASMMapping[]>([]);
  const [asmList, setAsmList] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ city: user?.city || '', locality: '', society: '', primary_asm_id: '', backup_asm_id: '' });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const [m, u] = await Promise.all([
      asmMappingApi.list(user?.role === 'city_manager' ? user.city || undefined : undefined),
      usersApi.list({ role: 'asm' }),
    ]);
    setMappings(m);
    setAsmList(u);
  };

  useEffect(() => { reload(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await asmMappingApi.create({ ...form, backup_asm_id: form.backup_asm_id || undefined });
      setForm({ city: user?.city || '', locality: '', society: '', primary_asm_id: '', backup_asm_id: '' });
      setShowForm(false);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' as const };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a237e' }}>ASM Mapping</h1>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 20px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
          {showForm ? 'Cancel' : '+ Add Mapping'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#333' }}>New ASM Mapping</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label style={{ fontSize: 13, fontWeight: 600 }}>City *</label>
              <input style={inputStyle} required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Bangalore" /></div>
            <div><label style={{ fontSize: 13, fontWeight: 600 }}>Locality *</label>
              <input style={inputStyle} required value={form.locality} onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))} placeholder="Koramangala" /></div>
            <div><label style={{ fontSize: 13, fontWeight: 600 }}>Society (optional)</label>
              <input style={inputStyle} value={form.society} onChange={(e) => setForm((f) => ({ ...f, society: e.target.value }))} placeholder="Golden Palms" /></div>
            <div><label style={{ fontSize: 13, fontWeight: 600 }}>Primary ASM *</label>
              <select style={inputStyle} required value={form.primary_asm_id} onChange={(e) => setForm((f) => ({ ...f, primary_asm_id: e.target.value }))}>
                <option value="">Select ASM…</option>
                {asmList.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.city})</option>)}
              </select></div>
            <div><label style={{ fontSize: 13, fontWeight: 600 }}>Backup ASM</label>
              <select style={inputStyle} value={form.backup_asm_id} onChange={(e) => setForm((f) => ({ ...f, backup_asm_id: e.target.value }))}>
                <option value="">None</option>
                {asmList.filter((a) => a.id !== form.primary_asm_id).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.city})</option>)}
              </select></div>
          </div>
          <button type="submit" disabled={saving}
            style={{ marginTop: 16, padding: '9px 24px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Mapping'}
          </button>
        </form>
      )}

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8f9ff' }}>
              {['City', 'Locality', 'Society', 'Primary ASM', 'Backup ASM'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mappings.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#999' }}>No mappings yet.</td></tr>
            ) : (
              mappings.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '12px 16px' }}>{m.city}</td>
                  <td style={{ padding: '12px 16px' }}>{m.locality}</td>
                  <td style={{ padding: '12px 16px', color: '#999' }}>{m.society || '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{m.primary_asm?.name || m.primary_asm_id}</td>
                  <td style={{ padding: '12px 16px', color: '#666' }}>{m.backup_asm?.name || m.backup_asm_id || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
