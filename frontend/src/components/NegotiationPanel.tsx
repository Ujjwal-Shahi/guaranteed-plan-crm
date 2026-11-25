import { useState, useEffect } from 'react';
import { dealsApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { Deal, Offer, Visit } from '../types';

export default function NegotiationPanel({ deal, visit, onUpdated }: { deal: Deal; visit: Visit | null; onUpdated: () => void }) {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [offerType, setOfferType] = useState<'offer' | 'counter'>('offer');
  const [submitting, setSubmitting] = useState(false);

  // Outcome
  const [outcome, setOutcome] = useState('');
  const [dropReason, setDropReason] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [acquisitionPrice, setAcquisitionPrice] = useState('');
  const [settingOutcome, setSettingOutcome] = useState(false);

  const canAct = user?.role === 'agent2' && ['asm_submitted', 'negotiating'].includes(deal.status);
  const isDone = ['acquired', 'closed_lost'].includes(deal.status);

  const reload = async () => {
    const o = await dealsApi.getOffers(deal.id);
    setOffers(o);
  };

  useEffect(() => { reload(); }, [deal.id]);

  const handleOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    try {
      await dealsApi.createOffer(deal.id, { amount: parseFloat(amount), offer_type: offerType, note });
      setAmount(''); setNote('');
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  const handleOutcome = async () => {
    if (!outcome) return;
    setSettingOutcome(true);
    try {
      await dealsApi.setOutcome(deal.id, {
        outcome,
        reason: dropReason || undefined,
        follow_up_date: followUpDate || undefined,
        acquisition_price: acquisitionPrice ? parseFloat(acquisitionPrice) : undefined,
      });
      onUpdated();
    } finally {
      setSettingOutcome(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* ASM inputs side-by-side */}
      {visit && visit.submitted_at && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', gridColumn: '1/-1' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#333' }}>ASM Evidence for Negotiation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <Stat label="ASM Price" value={`₹${visit.asm_price?.toLocaleString()}`} />
            <Stat label="Confidence" value={visit.confidence || '—'} />
            {visit.form_json && (
              <>
                {(visit.form_json as Record<string, unknown>).seller_expected_price && (
                  <Stat label="Seller Asking" value={`₹${((visit.form_json as Record<string, unknown>).seller_expected_price as number)?.toLocaleString()}`} />
                )}
                {(visit.form_json as Record<string, unknown>).condition_refurb_bucket && (
                  <Stat label="Refurb Cost" value={(visit.form_json as Record<string, unknown>).condition_refurb_bucket as string} />
                )}
                {(visit.form_json as Record<string, unknown>).condition_overall_rating && (
                  <Stat label="Condition" value={`${(visit.form_json as Record<string, unknown>).condition_overall_rating}/5`} />
                )}
                {(visit.form_json as Record<string, unknown>).furnishing_status && (
                  <Stat label="Furnishing" value={(visit.form_json as Record<string, unknown>).furnishing_status as string} />
                )}
              </>
            )}
          </div>
          {visit.form_json && (visit.form_json as Record<string, unknown[]>).top_positives?.filter(Boolean).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Top Positives</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {((visit.form_json as Record<string, string[]>).top_positives || []).filter(Boolean).map((p, i) => (
                  <span key={i} style={{ fontSize: 12, background: '#e8f5e9', color: '#2e7d32', padding: '2px 10px', borderRadius: 12 }}>✓ {p}</span>
                ))}
              </div>
            </div>
          )}
          {visit.form_json && (visit.form_json as Record<string, unknown[]>).top_negatives?.filter(Boolean).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Top Negatives</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {((visit.form_json as Record<string, string[]>).top_negatives || []).filter(Boolean).map((n, i) => (
                  <span key={i} style={{ fontSize: 12, background: '#ffebee', color: '#c62828', padding: '2px 10px', borderRadius: 12 }}>✗ {n}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Offer log */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#333' }}>Offer Log</h3>
        {offers.length === 0 ? (
          <p style={{ color: '#999', fontSize: 14 }}>No offers yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {offers.map((o) => (
              <div key={o.id} style={{ padding: 12, background: o.offer_type === 'offer' ? '#e8eaf6' : '#fff3e0', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: o.offer_type === 'offer' ? '#003335' : '#e65100' }}>
                    {o.offer_type === 'offer' ? '📤 Our Offer' : '📥 Counter'}
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>₹{o.amount.toLocaleString()}</span>
                </div>
                {o.note && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{o.note}</div>}
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{new Date(o.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {canAct && (
          <form onSubmit={handleOffer} style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {['offer', 'counter'].map((t) => (
                <button key={t} type="button" onClick={() => setOfferType(t as 'offer' | 'counter')}
                  style={{ flex: 1, padding: '7px 0', border: '1px solid', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    borderColor: offerType === t ? '#003335' : '#ddd',
                    background: offerType === t ? '#003335' : '#fff',
                    color: offerType === t ? '#fff' : '#555',
                  }}>
                  {t === 'offer' ? 'Our Offer' : 'Counter Offer'}
                </button>
              ))}
            </div>
            <input style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }}
              type="number" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <input style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }}
              placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="submit" disabled={submitting}
              style={{ width: '100%', padding: '8px 0', background: '#FE7541', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Logging…' : 'Log Offer'}
            </button>
          </form>
        )}
      </div>

      {/* Outcome */}
      {canAct && !isDone && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#333' }}>Set Outcome</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { value: 'accepted', label: '✅ Accepted' },
              { value: 'dropped', label: '❌ Drop' },
              { value: 'on_hold', label: '⏸ On Hold' },
            ].map((o) => (
              <button key={o.value} onClick={() => setOutcome(o.value)}
                style={{ flex: 1, padding: '8px 0', border: '1px solid', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  borderColor: outcome === o.value ? '#003335' : '#ddd',
                  background: outcome === o.value ? '#003335' : '#fff',
                  color: outcome === o.value ? '#fff' : '#555',
                }}>
                {o.label}
              </button>
            ))}
          </div>
          {outcome === 'accepted' && (
            <input style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }}
              type="number" placeholder="Acquisition price (₹) *" value={acquisitionPrice} onChange={(e) => setAcquisitionPrice(e.target.value)} required />
          )}
          {outcome === 'dropped' && (
            <input style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }}
              placeholder="Reason for dropping *" value={dropReason} onChange={(e) => setDropReason(e.target.value)} required />
          )}
          {outcome === 'on_hold' && (
            <input style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }}
              type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} required />
          )}
          {outcome && (
            <button onClick={handleOutcome} disabled={settingOutcome}
              style={{ width: '100%', padding: '9px 0', background: '#FE7541', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', opacity: settingOutcome ? 0.7 : 1 }}>
              {settingOutcome ? 'Saving…' : 'Confirm Outcome'}
            </button>
          )}
        </div>
      )}

      {isDone && (
        <div style={{ background: deal.status === 'acquired' ? '#e8f5e9' : '#ffebee', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{deal.status === 'acquired' ? '🎉' : '😔'}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: deal.status === 'acquired' ? '#2e7d32' : '#c62828' }}>
            {deal.status === 'acquired' ? 'Deal Acquired!' : 'Deal Closed (Lost)'}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f8f9ff', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: '#999' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#333', textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}
