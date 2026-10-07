import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dealsApi, usersApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import ASMVisitForm from '../components/ASMVisitForm';
import NegotiationPanel from '../components/NegotiationPanel';
import PhotosPanel from '../components/PhotosPanel';
import type { Deal, Visit, DealEvent, SLATimer, User } from '../types';
import { formatDistanceToNow, format, isPast } from 'date-fns';

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [events, setEvents] = useState<DealEvent[]>([]);
  const [slaTimers, setSlaTimers] = useState<SLATimer[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'visit' | 'photos' | 'negotiate' | 'activity'>('overview');
  const [loading, setLoading] = useState(true);

  // For manager assignment
  const [asmList, setAsmList] = useState<User[]>([]);
  const [assignAsmId, setAssignAsmId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Visit scheduling
  const [scheduleSlot, setScheduleSlot] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const reload = async () => {
    if (!id) return;
    try {
      const [d, v, e, s] = await Promise.all([
        dealsApi.get(id),
        dealsApi.getVisits(id),
        dealsApi.getEvents(id),
        dealsApi.getSla(id),
      ]);
      setDeal(d);
      setVisits(v);
      setEvents(e);
      setSlaTimers(s);
    } catch {
      navigate('/deals');
    }
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user && ['city_manager', 'admin'].includes(user.role)) {
      usersApi.list({ role: 'asm', city: user.city || undefined }).then(setAsmList);
    }
  }, [user]);

  const handleAssignAsm = async () => {
    if (!id || !assignAsmId) return;
    setAssigning(true);
    try {
      await dealsApi.assignAsm(id, assignAsmId);
      await reload();
    } finally {
      setAssigning(false);
    }
  };

  const handleScheduleVisit = async () => {
    if (!id || !scheduleSlot) return;
    setScheduling(true);
    try {
      await dealsApi.scheduleVisit(id, { scheduled_at: scheduleSlot });
      await reload();
      setActiveTab('photos');
    } finally {
      setScheduling(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading…</div>;
  if (!deal) return null;

  const latestVisit = visits[visits.length - 1];
  const canSchedule = user?.role === 'asm' && deal.asm_id === user.id && ['asm_assigned', 'visit_scheduled'].includes(deal.status);
  const canSubmitForm = user?.role === 'asm' && deal.asm_id === user.id && deal.status === 'visit_scheduled';
  const canNegotiate = user?.role === 'agent2' && ['asm_submitted', 'negotiating'].includes(deal.status);
  const canAssign = ['city_manager', 'admin'].includes(user?.role || '') && ['manager_queue', 'asm_assigned'].includes(deal.status);

  const activeTimers = slaTimers.filter((t) => !t.paused_at && !t.breached_at);

  const TABS = [
    { id: 'overview', label: 'Overview' },
    ...(canSchedule || canSubmitForm || deal.status !== 'interested' ? [{ id: 'visit', label: 'ASM Visit' }] : []),
    { id: 'photos', label: 'Photos' },
    ...(canNegotiate || ['negotiating', 'acquired', 'closed_lost'].includes(deal.status) ? [{ id: 'negotiate', label: 'Negotiation' }] : []),
    { id: 'activity', label: 'Activity Log' },
  ] as { id: typeof activeTab; label: string }[];

  return (
    <div>
      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a237e' }}>{deal.seller_name}</h1>
              <StatusBadge status={deal.status} />
              {deal.duplicate_of && (
                <span style={{ fontSize: 12, background: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  ⚠️ Possible Duplicate
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
              {deal.society} · {deal.locality} · {deal.city} · Flat {deal.flat_number}{deal.tower ? ` (Tower ${deal.tower})` : ''} · {deal.bhk}
              {deal.carpet_area && ` · ${deal.carpet_area} sq ft`}
              {deal.occupancy && ` · ${deal.occupancy}`}
            </div>
            <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
              📞 {deal.seller_phone} · Created {formatDistanceToNow(new Date(deal.created_at))} ago
            </div>
          </div>
          <button onClick={() => navigate('/deals')} style={{ background: '#f5f5f5', border: 'none', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', color: '#555', fontSize: 13 }}>
            ← Back
          </button>
        </div>

        {/* SLA warnings */}
        {activeTimers.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {activeTimers.map((t) => {
              const overdue = isPast(new Date(t.due_at));
              return (
                <span key={t.id} style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 12, fontWeight: 600,
                  background: overdue ? '#ffebee' : '#fff8e1',
                  color: overdue ? '#c62828' : '#f57f17',
                }}>
                  {overdue ? '🔴' : '🟡'} SLA ({t.sla_type.replace(/_/g, ' ')}): {overdue ? 'BREACHED' : `due ${format(new Date(t.due_at), 'dd MMM, h:mm a')}`}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#fff', borderRadius: 10, padding: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '8px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
              background: activeTab === tab.id ? '#1a237e' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#555',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Team */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#333' }}>Team</h3>
            {[
              { label: 'Agent 1', user: deal.agent1 },
              { label: 'ASM', user: deal.asm },
              { label: 'Agent 2', user: deal.agent2 },
            ].map(({ label, user: u }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: '#666' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{u ? u.name : '—'}</span>
              </div>
            ))}
          </div>

          {/* Visit slots */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#333' }}>Visit Slots</h3>
            {deal.visit_slots && deal.visit_slots.length > 0 ? (
              deal.visit_slots.map((slot, i) => (
                <div key={i} style={{ fontSize: 14, marginBottom: 6 }}>
                  Slot {i + 1}: {new Date(slot).toLocaleString()}
                </div>
              ))
            ) : (
              <span style={{ color: '#999', fontSize: 14 }}>No preferred slots provided</span>
            )}
          </div>

          {/* Notes */}
          {deal.agent1_notes && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', gridColumn: '1/-1' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#333' }}>Agent 1 Notes</h3>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{deal.agent1_notes}</p>
            </div>
          )}

          {/* ASM Visit Summary */}
          {latestVisit && latestVisit.submitted_at && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', gridColumn: '1/-1' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#333' }}>ASM Visit Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#999' }}>ASM Price</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a237e' }}>₹{latestVisit.asm_price?.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#999' }}>Confidence</div>
                  <div style={{ fontSize: 15, fontWeight: 600, textTransform: 'capitalize' }}>{latestVisit.confidence}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#999' }}>Outcome</div>
                  <div style={{ fontSize: 15, fontWeight: 600, textTransform: 'capitalize', color: latestVisit.outcome === 'suitable' ? '#2e7d32' : '#c62828' }}>
                    {latestVisit.outcome}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assign ASM (Manager) */}
          {canAssign && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', gridColumn: '1/-1' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#333' }}>Assign ASM</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  value={assignAsmId} onChange={(e) => setAssignAsmId(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
                >
                  <option value="">Select ASM…</option>
                  {asmList.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.city})</option>)}
                </select>
                <button
                  onClick={handleAssignAsm} disabled={!assignAsmId || assigning}
                  style={{ padding: '8px 20px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, opacity: assigning ? 0.7 : 1 }}
                >
                  {assigning ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </div>
          )}

          {/* Schedule Visit (ASM) */}
          {canSchedule && !latestVisit && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', gridColumn: '1/-1' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#333' }}>Schedule Visit</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="datetime-local" value={scheduleSlot} onChange={(e) => setScheduleSlot(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
                />
                <button
                  onClick={handleScheduleVisit} disabled={!scheduleSlot || scheduling}
                  style={{ padding: '8px 20px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, opacity: scheduling ? 0.7 : 1 }}
                >
                  {scheduling ? 'Scheduling…' : 'Confirm Slot'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visit Tab */}
      {activeTab === 'visit' && (
        <div>
          {canSubmitForm && latestVisit ? (
            <ASMVisitForm deal={deal} visit={latestVisit} onSubmitted={reload} />
          ) : latestVisit?.submitted_at ? (
            <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#2e7d32' }}>✓ Visit Submitted</h3>
              <pre style={{ fontSize: 13, background: '#f5f5f5', padding: 16, borderRadius: 6, overflow: 'auto', maxHeight: 400 }}>
                {JSON.stringify(latestVisit.form_json, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center', color: '#999' }}>
              {deal.status === 'interested' || deal.status === 'asm_assigned' ? 'Visit not yet scheduled.' : 'Visit data not available.'}
            </div>
          )}
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <PhotosPanel deal={deal} canUpload={canSchedule || (user?.role === 'asm' && deal.asm_id === user.id)} onUpdated={reload} />
      )}

      {/* Negotiation Tab */}
      {activeTab === 'negotiate' && (
        <NegotiationPanel deal={deal} visit={latestVisit || null} onUpdated={reload} />
      )}

      {/* Activity Log */}
      {activeTab === 'activity' && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#333' }}>Activity Log</h3>
          {events.length === 0 ? (
            <p style={{ color: '#999' }}>No events yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[...events].reverse().map((ev, i) => (
                <div key={ev.id} style={{ display: 'flex', gap: 16, paddingBottom: i < events.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1a237e', marginTop: 4, flexShrink: 0 }} />
                    {i < events.length - 1 && <div style={{ width: 1, flex: 1, background: '#e0e0e0', marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}>
                      <strong>{ev.to_status.replace(/_/g, ' ')}</strong>
                      {ev.by_user && <span style={{ color: '#666' }}> by {ev.by_user.name}</span>}
                    </div>
                    {ev.reason && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{ev.reason}</div>}
                    <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>{new Date(ev.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
