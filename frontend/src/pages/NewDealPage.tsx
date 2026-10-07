import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dealsApi } from '../api';

const BHK_OPTIONS = ['1BHK', '2BHK', '3BHK', '4BHK+'];
const PRICE_BUCKET_OPTIONS = [
  { value: 'below_50l', label: 'Below ₹50L' },
  { value: '50l_1cr', label: '₹50L – ₹1Cr' },
  { value: '1cr_2cr', label: '₹1Cr – ₹2Cr' },
  { value: '2cr_3cr', label: '₹2Cr – ₹3Cr' },
  { value: '3cr_4cr', label: '₹3Cr – ₹4Cr' },
  { value: 'above_4cr', label: 'Above ₹4Cr' },
];
const OCCUPANCY_OPTIONS = [
  { value: 'self', label: 'Owner Occupied' },
  { value: 'tenant', label: 'Tenanted' },
  { value: 'vacant', label: 'Vacant' },
];

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#333' }}>
        {label} {required && <span style={{ color: '#c62828' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' as const,
};

export default function NewDealPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    seller_name: '', seller_phone: '', society: '', locality: '', city: '',
    tower: '', flat_number: '', bhk: '2BHK', carpet_area: '', occupancy: 'self',
    expected_price_bucket: '',
    agent1_notes: '', visit_slots: ['', '', ''],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setSlot = (i: number, v: string) =>
    setForm((f) => { const s = [...f.visit_slots]; s[i] = v; return { ...f, visit_slots: s }; });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        carpet_area: form.carpet_area ? parseFloat(form.carpet_area) : undefined,
        visit_slots: form.visit_slots.filter(Boolean),
      };
      const deal = await dealsApi.create(payload);
      navigate(`/deals/${deal.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a237e', marginBottom: 24 }}>New Deal</h1>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#444', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Seller Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Seller Name" required>
            <input style={inputStyle} value={form.seller_name} onChange={(e) => set('seller_name', e.target.value)} required />
          </Field>
          <Field label="Seller Phone" required>
            <input style={inputStyle} value={form.seller_phone} onChange={(e) => set('seller_phone', e.target.value)} required pattern="[0-9]{10}" placeholder="10-digit number" />
          </Field>
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#444', marginBottom: 16, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Property Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="City" required>
            <input style={inputStyle} value={form.city} onChange={(e) => set('city', e.target.value)} required placeholder="Bangalore" />
          </Field>
          <Field label="Locality" required>
            <input style={inputStyle} value={form.locality} onChange={(e) => set('locality', e.target.value)} required placeholder="Koramangala" />
          </Field>
          <Field label="Society / Building" required>
            <input style={inputStyle} value={form.society} onChange={(e) => set('society', e.target.value)} required placeholder="Golden Palms" />
          </Field>
          <Field label="Tower">
            <input style={inputStyle} value={form.tower} onChange={(e) => set('tower', e.target.value)} placeholder="A, B, C..." />
          </Field>
          <Field label="Flat Number" required>
            <input style={inputStyle} value={form.flat_number} onChange={(e) => set('flat_number', e.target.value)} required placeholder="301" />
          </Field>
          <Field label="BHK Configuration" required>
            <select style={inputStyle} value={form.bhk} onChange={(e) => set('bhk', e.target.value)}>
              {BHK_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Carpet Area (sq ft)">
            <input style={inputStyle} type="number" value={form.carpet_area} onChange={(e) => set('carpet_area', e.target.value)} placeholder="950" />
          </Field>
          <Field label="Occupancy">
            <select style={inputStyle} value={form.occupancy} onChange={(e) => set('occupancy', e.target.value)}>
              {OCCUPANCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Seller's Expected Price Range">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {PRICE_BUCKET_OPTIONS.map((o) => (
              <label key={o.value} style={{
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14,
                padding: '6px 14px', border: '1px solid', borderRadius: 20,
                borderColor: form.expected_price_bucket === o.value ? '#1a237e' : '#ddd',
                background: form.expected_price_bucket === o.value ? '#e8eaf6' : '#fff',
                color: form.expected_price_bucket === o.value ? '#1a237e' : '#555',
              }}>
                <input type="radio" name="expected_price_bucket" value={o.value}
                  checked={form.expected_price_bucket === o.value}
                  onChange={() => set('expected_price_bucket', o.value)}
                  style={{ display: 'none' }} />
                {o.label}
              </label>
            ))}
          </div>
        </Field>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#444', marginBottom: 16, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Preferred Visit Slots (up to 3)</h3>
        {[0, 1, 2].map((i) => (
          <Field key={i} label={`Slot ${i + 1}`}>
            <input
              style={inputStyle} type="datetime-local"
              value={form.visit_slots[i]} onChange={(e) => setSlot(i, e.target.value)}
            />
          </Field>
        ))}

        <Field label="Agent 1 Notes">
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={form.agent1_notes} onChange={(e) => set('agent1_notes', e.target.value)}
            placeholder="Any additional context about the seller or property…"
          />
        </Field>

        {error && <div style={{ color: '#c62828', marginBottom: 12, fontSize: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            type="submit" disabled={loading}
            style={{ padding: '10px 28px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creating…' : 'Create Deal'}
          </button>
          <button
            type="button" onClick={() => navigate('/deals')}
            style={{ padding: '10px 20px', background: '#f5f5f5', color: '#333', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
