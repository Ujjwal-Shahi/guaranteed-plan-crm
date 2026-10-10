import { useState, useEffect } from 'react';
import { dashboardApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  interested: 'Interested',
  asm_assigned: 'ASM Assigned',
  visit_scheduled: 'Visit Scheduled',
  asm_submitted: 'ASM Submitted',
  negotiating: 'Negotiating',
  acquired: 'Acquired',
  closed_lost: 'Closed: Lost',
  manager_queue: 'Manager Queue',
};

const STATUS_COLORS: Record<string, string> = {
  interested: '#42a5f5', asm_assigned: '#ab47bc', visit_scheduled: '#ffca28',
  asm_submitted: '#66bb6a', negotiating: '#ff7043', acquired: '#26a69a',
  closed_lost: '#ef5350', manager_queue: '#ec407a',
};

function StatCard({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 32, fontWeight: 800, color: color || '#003335' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [breaches, setBreaches] = useState<{ total_breaches: number; breaches: unknown[] }>({ total_breaches: 0, breaches: [] });
  const [asmLoad, setAsmLoad] = useState<{ id: string; name: string; city: string; open_deals: number }[]>([]);
  const [aging, setAging] = useState<{ id: string; society: string; status: string; days_in_status: number; days_since_creation: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const city = user?.role === 'city_manager' ? user.city || undefined : undefined;
    Promise.all([
      dashboardApi.funnel(city),
      dashboardApi.slaBreaches(city),
      dashboardApi.asmLoad(city),
      dashboardApi.aging(city),
    ]).then(([f, b, a, ag]) => {
      setFunnel(f);
      setBreaches(b as { total_breaches: number; breaches: unknown[] });
      setAsmLoad(a);
      setAging(ag as { id: string; society: string; status: string; days_in_status: number; days_since_creation: number }[]);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>Loading dashboard…</div>;

  const totalActive = Object.entries(funnel)
    .filter(([k]) => !['acquired', 'closed_lost'].includes(k))
    .reduce((s, [, v]) => s + v, 0);

  const FUNNEL_ORDER = ['interested', 'manager_queue', 'asm_assigned', 'visit_scheduled', 'asm_submitted', 'negotiating', 'acquired', 'closed_lost'];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#003335', marginBottom: 20 }}>Dashboard</h1>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard value={totalActive} label="Active Deals" />
        <StatCard value={funnel['acquired'] || 0} label="Acquired" color="#26a69a" />
        <StatCard value={funnel['negotiating'] || 0} label="Negotiating" color="#ff7043" />
        <StatCard value={breaches.total_breaches} label="SLA Breaches" color={breaches.total_breaches > 0 ? '#c62828' : '#2e7d32'} />
        <StatCard value={funnel['manager_queue'] || 0} label="Unassigned" color={funnel['manager_queue'] > 0 ? '#e65100' : '#333'} />
      </div>

      {/* Funnel */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#333' }}>Deal Funnel</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FUNNEL_ORDER.map((status) => {
            const count = funnel[status] || 0;
            const max = Math.max(...Object.values(funnel), 1);
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 130, fontSize: 13, color: '#555', textAlign: 'right', flexShrink: 0 }}>{STATUS_LABELS[status]}</div>
                <div style={{ flex: 1, height: 28, background: '#f5f5f5', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: STATUS_COLORS[status] || '#90a4ae', borderRadius: 4, transition: 'width 0.5s', minWidth: count > 0 ? 4 : 0 }} />
                </div>
                <div style={{ width: 32, fontSize: 14, fontWeight: 700, color: '#333' }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* ASM Load */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#333' }}>ASM Load</h3>
          {asmLoad.length === 0 ? (
            <p style={{ color: '#999', fontSize: 14 }}>No ASMs found.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['ASM', 'City', 'Open Deals'].map((h) => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#999', fontSize: 12, borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asmLoad.sort((a, b) => b.open_deals - a.open_deals).map((a) => (
                  <tr key={a.id}>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid #f8f8f8' }}>{a.name}</td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid #f8f8f8', color: '#666' }}>{a.city}</td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid #f8f8f8', fontWeight: 700,
                      color: a.open_deals > 5 ? '#c62828' : a.open_deals > 3 ? '#e65100' : '#2e7d32' }}>
                      {a.open_deals}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Aging Deals */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#333' }}>Aging Deals</h3>
          {aging.length === 0 ? (
            <p style={{ color: '#999', fontSize: 14 }}>No active deals.</p>
          ) : (
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff' }}>
                  <tr>
                    {['Society', 'Status', 'Days'].map((h) => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#999', fontSize: 12, borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aging.sort((a, b) => b.days_since_creation - a.days_since_creation).slice(0, 20).map((d) => (
                    <tr key={d.id}>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f8f8f8' }}>{d.society}</td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f8f8f8', color: '#666' }}>{STATUS_LABELS[d.status]}</td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f8f8f8', fontWeight: 700,
                        color: d.days_since_creation > 7 ? '#c62828' : d.days_since_creation > 3 ? '#e65100' : '#2e7d32' }}>
                        {d.days_since_creation}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
