"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AgentActions({
  agentId,
  isActive,
  leaves,
}: {
  agentId: string;
  isActive: boolean;
  leaves: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(url: string, body: object, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed");
      } else {
        if (data.openLeadsNeedingCover > 0) {
          setNotice(`${data.openLeadsNeedingCover} open leads now need cover. Use Reassign below.`);
        }
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-amber-700">{notice}</p>}
      <div className="flex flex-wrap gap-2">
        {isActive ? (
          <button
            disabled={busy}
            onClick={() =>
              run(`/api/agents/${agentId}`, { action: "deactivate" }, "Deactivate this agent? Their records are kept.")
            }
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Deactivate (exit)
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => run(`/api/agents/${agentId}`, { action: "reactivate" })}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Reactivate
          </button>
        )}
        {leaves.map((l) => (
          <button
            key={l.id}
            disabled={busy}
            onClick={() => run(`/api/agents/${agentId}/leave/${l.id}`, { action: "cancel" }, `Cancel leave ${l.label}?`)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel leave {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
