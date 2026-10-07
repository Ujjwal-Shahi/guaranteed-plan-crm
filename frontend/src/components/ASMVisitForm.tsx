import { useState } from 'react';
import { dealsApi } from '../api';
import type { Deal, Visit } from '../types';

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' as const,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#666', marginBottom: 14, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#333' }}>
        {label}{required && <span style={{ color: '#c62828' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function Rating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          style={{ width: 36, height: 36, borderRadius: 6, border: '1px solid', cursor: 'pointer', fontWeight: 700, fontSize: 15,
            borderColor: value === n ? '#1a237e' : '#ddd',
            background: value === n ? '#1a237e' : '#fff',
            color: value === n ? '#fff' : '#555',
          }}>
          {n}
        </button>
      ))}
    </div>
  );
}

interface FormState {
  condition_overall_rating: number;
  condition_issues: string[];
  condition_refurb_bucket: string;
  furnishing_status: string;
  furnishing_items_staying: string[];
  seller_reason: string;
  seller_urgency: string;
  seller_expected_price: string;
  seller_other_brokers: boolean | null;
  seller_decision_makers: string;
  doc_title_in_seller_name: string;
  doc_khata_type: string;
  doc_oc_cc: string;
  doc_property_tax_paid: string;
  doc_loan_outstanding: string;
  asm_price: string;
  asm_confidence: string;
  top_positives: string[];
  top_negatives: string[];
  outcome: string;
  not_suitable_reason: string;
}

export default function ASMVisitForm({ deal, visit, onSubmitted }: { deal: Deal; visit: Visit; onSubmitted: () => void }) {
  const [form, setForm] = useState<FormState>({
    condition_overall_rating: 3,
    condition_issues: [],
    condition_refurb_bucket: '',
    furnishing_status: '',
    furnishing_items_staying: [],
    seller_reason: '',
    seller_urgency: '',
    seller_expected_price: '',
    seller_other_brokers: null,
    seller_decision_makers: '',
    doc_title_in_seller_name: '',
    doc_khata_type: '',
    doc_oc_cc: '',
    doc_property_tax_paid: '',
    doc_loan_outstanding: '',
    asm_price: '',
    asm_confidence: 'medium',
    top_positives: ['', '', ''],
    top_negatives: ['', '', ''],
    outcome: 'suitable',
    not_suitable_reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleList = (key: keyof FormState, val: string) => {
    setForm((f) => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  const setListItem = (key: 'top_positives' | 'top_negatives', i: number, val: string) => {
    setForm((f) => { const arr = [...f[key]]; arr[i] = val; return { ...f, [key]: arr }; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asm_price) { setError('ASM price is required'); return; }
    if (!form.outcome) { setError('Outcome is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await dealsApi.submitVisitForm(deal.id, visit.id, {
        ...form,
        asm_price: parseFloat(form.asm_price),
        seller_expected_price: form.seller_expected_price ? parseFloat(form.seller_expected_price) : null,
        top_positives: form.top_positives.filter(Boolean),
        top_negatives: form.top_negatives.filter(Boolean),
      });
      onSubmitted();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Submission failed. Check mandatory photos are uploaded.');
    } finally {
      setSubmitting(false);
    }
  };

  const checkBox = (label: string, key: keyof FormState, val: string) => (
    <label key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 14, marginBottom: 6, cursor: 'pointer', fontSize: 14 }}>
      <input type="checkbox" checked={(form[key] as string[]).includes(val)} onChange={() => toggleList(key, val)} />
      {label}
    </label>
  );

  const radioGroup = (key: keyof FormState, options: { value: string; label: string }[]) => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, padding: '6px 14px', border: '1px solid', borderRadius: 20,
          borderColor: (form[key] as string) === o.value ? '#1a237e' : '#ddd',
          background: (form[key] as string) === o.value ? '#e8eaf6' : '#fff',
          color: (form[key] as string) === o.value ? '#1a237e' : '#555',
        }}>
          <input type="radio" name={key as string} value={o.value} checked={(form[key] as string) === o.value}
            onChange={() => setForm((f) => ({ ...f, [key]: o.value }))} style={{ display: 'none' }} />
          {o.label}
        </label>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, color: '#1a237e' }}>ASM Visit Form</h3>

      <Section title="Condition">
        <Field label="Overall Rating (1 = poor, 5 = excellent)" required>
          <Rating value={form.condition_overall_rating} onChange={(v) => setForm((f) => ({ ...f, condition_overall_rating: v }))} />
        </Field>
        <Field label="Issues Observed">
          <div>
            {['seepage', 'cracks', 'wiring', 'plumbing', 'fittings', 'paint'].map((issue) =>
              checkBox(issue.charAt(0).toUpperCase() + issue.slice(1), 'condition_issues', issue)
            )}
          </div>
        </Field>
        <Field label="Refurb Cost Estimate">
          {radioGroup('condition_refurb_bucket', [
            { value: 'under_50k', label: 'Under ₹50K' },
            { value: '50k_2l', label: '₹50K – ₹2L' },
            { value: 'over_2l', label: 'Over ₹2L' },
          ])}
        </Field>
      </Section>

      <Section title="Furnishing">
        <Field label="Furnishing Status" required>
          {radioGroup('furnishing_status', [
            { value: 'furnished', label: 'Furnished' },
            { value: 'semi', label: 'Semi-Furnished' },
            { value: 'unfurnished', label: 'Unfurnished' },
          ])}
        </Field>
        <Field label="Items Staying">
          <div>
            {['wardrobes', 'modular_kitchen', 'acs', 'lights', 'fans'].map((item) =>
              checkBox(item.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), 'furnishing_items_staying', item)
            )}
          </div>
        </Field>
      </Section>

      <Section title="Seller Intent">
        <Field label="Reason for Selling">
          <input style={inputStyle} value={form.seller_reason} onChange={(e) => setForm((f) => ({ ...f, seller_reason: e.target.value }))} placeholder="Upgrading, relocation, financial need…" />
        </Field>
        <Field label="Urgency" required>
          {radioGroup('seller_urgency', [
            { value: 'immediate', label: 'Immediate' },
            { value: '1_month', label: '1 Month' },
            { value: '3_months', label: '3 Months' },
            { value: 'flexible', label: 'Flexible' },
          ])}
        </Field>
        <Field label="Seller's Expected Price (₹)">
          <input style={inputStyle} type="number" value={form.seller_expected_price} onChange={(e) => setForm((f) => ({ ...f, seller_expected_price: e.target.value }))} placeholder="8500000" />
        </Field>
        <Field label="Other Brokers / Offers?">
          {radioGroup('seller_other_brokers', [
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ])}
        </Field>
        <Field label="Decision Makers">
          <input style={inputStyle} value={form.seller_decision_makers} onChange={(e) => setForm((f) => ({ ...f, seller_decision_makers: e.target.value }))} placeholder="Owner, spouse, parents…" />
        </Field>
      </Section>

      <Section title="Documents Seen">
        {[
          { key: 'doc_title_in_seller_name', label: 'Title in Seller Name' },
          { key: 'doc_khata_type', label: 'Khata Type' },
          { key: 'doc_oc_cc', label: 'OC / CC' },
          { key: 'doc_property_tax_paid', label: 'Property Tax Paid' },
          { key: 'doc_loan_outstanding', label: 'Loan Outstanding' },
        ].map(({ key, label }) => (
          <Field key={key} label={label}>
            {radioGroup(key as keyof FormState, [
              { value: 'seen', label: 'Seen' },
              { value: 'not_seen', label: 'Not Seen' },
              { value: 'unknown', label: 'Unknown' },
            ])}
          </Field>
        ))}
      </Section>

      <Section title="ASM Verdict">
        <Field label="ASM Price (₹)" required>
          <input style={inputStyle} type="number" value={form.asm_price} onChange={(e) => setForm((f) => ({ ...f, asm_price: e.target.value }))} required placeholder="8000000" />
        </Field>
        <Field label="Confidence" required>
          {radioGroup('asm_confidence', [
            { value: 'low', label: '🔴 Low' },
            { value: 'medium', label: '🟡 Medium' },
            { value: 'high', label: '🟢 High' },
          ])}
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Field label="Top 3 Positives">
              {[0, 1, 2].map((i) => (
                <input key={i} style={{ ...inputStyle, marginBottom: 6 }} value={form.top_positives[i]}
                  onChange={(e) => setListItem('top_positives', i, e.target.value)} placeholder={`Positive ${i + 1}`} />
              ))}
            </Field>
          </div>
          <div>
            <Field label="Top 3 Negatives">
              {[0, 1, 2].map((i) => (
                <input key={i} style={{ ...inputStyle, marginBottom: 6 }} value={form.top_negatives[i]}
                  onChange={(e) => setListItem('top_negatives', i, e.target.value)} placeholder={`Negative ${i + 1}`} />
              ))}
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Outcome">
        <Field label="Property Suitable?" required>
          {radioGroup('outcome', [
            { value: 'suitable', label: '✅ Suitable' },
            { value: 'not_suitable', label: '❌ Not Suitable' },
          ])}
        </Field>
        {form.outcome === 'not_suitable' && (
          <Field label="Reason Not Suitable" required>
            {radioGroup('not_suitable_reason', [
              { value: 'condition', label: 'Condition' },
              { value: 'legal', label: 'Legal' },
              { value: 'price_expectation', label: 'Price Too High' },
              { value: 'seller_withdrew', label: 'Seller Withdrew' },
            ])}
          </Field>
        )}
      </Section>

      {error && <div style={{ color: '#c62828', marginBottom: 12, padding: '8px 12px', background: '#ffebee', borderRadius: 6, fontSize: 14 }}>{error}</div>}

      <button
        type="submit" disabled={submitting}
        style={{ padding: '11px 32px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? 'Submitting…' : 'Submit Visit Form'}
      </button>
      <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>All mandatory photos must be uploaded before submitting.</p>
    </form>
  );
}
