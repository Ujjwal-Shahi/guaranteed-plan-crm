import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dealsApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import type { Deal, DealStatus } from '../types';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'interested', label: 'Interested' },
  { value: 'manager_queue', label: 'Manager Queue' },
  { value: 'asm_assigned', label: 'ASM Assigned' },
  { value: 'visit_scheduled', label: 'Visit Scheduled' },
  { value: 'asm_submitted', label: 'ASM Submitted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'acquired', label: 'Acquired' },
  { value: 'closed_lost', label: 'Closed: Lost' },
];

export default function DealsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    dealsApi.list(statusFilter ? { status: statusFilter } : {})
      .then(setDeals)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = deals.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.seller_name.toLowerCase().includes(q) ||
      d.society.toLowerCase().includes(q) ||
      d.locality.toLowerCase().includes(q) ||
      d.seller_phone.includes(q);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a237e' }}>
          {user?.role === 'asm' ? 'My Assigned Deals' : user?.role === 'agent1' ? 'My Deals' : 'All Deals'}
        </h1>
        {(user?.role === 'agent1' || user?.role === 'admin') && (
          <button
            onClick={() => navigate('/deals/new')}
            style={{ padding: '8px 20px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >
            + New Deal
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          placeholder="Search name, society, phone…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, minWidth: 240 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              style={{
                padding: '6px 14px', border: '1px solid', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                borderColor: statusFilter === opt.value ? '#1a237e' : '#ddd',
                background: statusFilter === opt.value ? '#1a237e' : '#fff',
                color: statusFilter === opt.value ? '#fff' : '#333',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Loading deals…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          {search ? 'No deals match your search.' : 'No deals found.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((deal) => (
            <Link
              key={deal.id}
              to={`/deals/${deal.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                background: '#fff', borderRadius: 10, padding: '14px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', gap: 16,
                alignItems: 'flex-start', transition: 'box-shadow 0.15s',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{deal.seller_name}</span>
                    <StatusBadge status={deal.status as DealStatus} />
                    {deal.duplicate_of && (
                      <span style={{ fontSize: 11, background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                        ⚠️ Possible Duplicate
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    {deal.society} · {deal.locality} · {deal.city} · Flat {deal.flat_number} · {deal.bhk}
                  </div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4, display: 'flex', gap: 12 }}>
                    <span>📞 {deal.seller_phone}</span>
                    {deal.asm && <span>ASM: {deal.asm.name}</span>}
                    {deal.agent1 && <span>A1: {deal.agent1.name}</span>}
                    <span>{formatDistanceToNow(new Date(deal.created_at))} ago</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
