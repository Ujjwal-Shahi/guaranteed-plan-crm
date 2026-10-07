import type { DealStatus } from '../types';

const STATUS_CONFIG: Record<DealStatus, { label: string; bg: string; color: string }> = {
  interested:     { label: 'Interested',     bg: '#e3f2fd', color: '#1565c0' },
  asm_assigned:   { label: 'ASM Assigned',   bg: '#f3e5f5', color: '#6a1b9a' },
  visit_scheduled:{ label: 'Visit Scheduled',bg: '#fff8e1', color: '#f57f17' },
  asm_submitted:  { label: 'ASM Submitted',  bg: '#e8f5e9', color: '#2e7d32' },
  negotiating:    { label: 'Negotiating',    bg: '#fff3e0', color: '#e65100' },
  acquired:       { label: 'Acquired',       bg: '#e0f2f1', color: '#00695c' },
  closed_lost:    { label: 'Closed: Lost',   bg: '#ffebee', color: '#c62828' },
  manager_queue:  { label: 'Manager Queue',  bg: '#fce4ec', color: '#880e4f' },
};

export default function StatusBadge({ status }: { status: DealStatus }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#f5f5f5', color: '#555' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: cfg.bg,
      color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}
