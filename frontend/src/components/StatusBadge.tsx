import type { DealStatus } from '../types';

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  interested: { bg: '#e3f2fd', color: '#1565c0', label: 'Interested' },
  asm_assigned: { bg: '#f3e5f5', color: '#7b1fa2', label: 'ASM Assigned' },
  visit_scheduled: { bg: '#fff8e1', color: '#f57f17', label: 'Visit Scheduled' },
  asm_submitted: { bg: '#e8f5e9', color: '#2e7d32', label: 'ASM Submitted' },
  negotiating: { bg: '#fff3e0', color: '#e65100', label: 'Negotiating' },
  acquired: { bg: '#e8f5e9', color: '#1b5e20', label: 'Acquired' },
  closed_lost: { bg: '#ffebee', color: '#c62828', label: 'Closed: Lost' },
  manager_queue: { bg: '#fce4ec', color: '#880e4f', label: 'Manager Queue' },
};

export default function StatusBadge({ status }: { status: DealStatus | string }) {
  const cfg = STATUS_COLORS[status] || { bg: '#eee', color: '#333', label: status };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: cfg.bg,
      color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}
