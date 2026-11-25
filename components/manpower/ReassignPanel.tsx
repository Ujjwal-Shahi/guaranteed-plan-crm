"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Preview {
  confirmed: boolean;
  moved?: number;
  total: number;
  perTarget: { agentId: string; name: string; assigned: number; loadAfter: number; capacity: number; overCapacity: boolean }[];
}

export function ReassignPanel({
  agentId,
  openLeads,
  targets,
}: {
  agentId: string;
  openLeads: number;
  targets: { id: string; name: string; open: number; capacity: number }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setPreview(null);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  async function send(confirm: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toAgentIds: selected, confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reassign failed");
      } else {
        setPreview(data);
        if (data.confirmed) router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  if (openLeads === 0 && !preview?.confirmed) {
    return <p className="text-sm text-gray-500">No open leads to move.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {openLeads} open lead{openLeads === 1 ? "" : "s"} will move. Closed, cancelled and refund leads stay with the original owner.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded border border-gray-200 divide-y divide-gray-100 max-h-56 overflow-auto">
        {targets.length === 0 && <p className="p-3 text-sm text-gray-400">No other active agents available.</p>}
        {targets.map((t) => (
          <label key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
            <span className="flex-1 text-gray-900">{t.name}</span>
            <span className="text-xs text-gray-500">{t.open} / {t.capacity} open</span>
          </label>
        ))}
      </div>

      {preview && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
          <p className="font-medium text-gray-800">
            {preview.confirmed ? `Moved ${preview.moved} of ${preview.total} leads` : `Preview: ${preview.total} leads`}
          </p>
          {preview.perTarget.map((t) => (
            <p key={t.agentId} className={t.overCapacity ? "text-red-600" : "text-gray-700"}>
              {t.name}: +{t.assigned} (load {t.loadAfter} / {t.capacity}){t.overCapacity ? " · over capacity" : ""}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          disabled={busy || selected.length === 0}
          onClick={() => send(false)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Preview
        </button>
        <button
          disabled={busy || !preview || preview.confirmed || preview.total === 0}
          onClick={() => send(true)}
          className="rounded-md bg-[#3D4FD6] px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          Confirm move
        </button>
      </div>
    </div>
  );
}
