"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RefundStatus } from "@prisma/client";

const btn = "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60";
const primary = `${btn} bg-[#3D4FD6] text-white hover:bg-indigo-700`;
const secondary = `${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`;
const danger = `${btn} border border-red-300 text-red-700 hover:bg-red-50`;

export function RefundActions({ refundId, status }: { refundId: string; status: RefundStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denying, setDenying] = useState(false);
  const [mailLogged, setMailLogged] = useState(false);
  const [penalty, setPenalty] = useState("");

  async function call(url: string, method: string, body?: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed");
      } else {
        setDenying(false);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  const act = (action: string, extra: object = {}) =>
    call(`/api/refunds/${refundId}`, "PATCH", { action, ...extra });

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {status === "RAISED" && !denying && (
          <>
            <button className={secondary} disabled={busy} onClick={() => call(`/api/refunds/${refundId}/call`, "POST")}>
              Log call
            </button>
            <button className={primary} disabled={busy} onClick={() => act("approve")}>
              Approve
            </button>
            <button className={danger} disabled={busy} onClick={() => setDenying(true)}>
              Deny…
            </button>
          </>
        )}
        {status === "APPROVED" && (
          <button className={primary} disabled={busy} onClick={() => act("initiate")}>
            Mark initiated
          </button>
        )}
        {status === "INITIATED" && (
          <button className={primary} disabled={busy} onClick={() => act("credit")}>
            Mark credited
          </button>
        )}
        {status === "DENIED" && (
          <button className={primary} disabled={busy} onClick={() => act("recover")}>
            Start token recovery
          </button>
        )}
        {status === "RECOVERY" && (
          <button className={primary} disabled={busy} onClick={() => act("settle")}>
            Mark settled
          </button>
        )}
        {(status === "CREDITED" || status === "SETTLED") && (
          <span className="text-sm text-gray-500">This refund is closed.</span>
        )}
      </div>

      {denying && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input type="checkbox" checked={mailLogged} onChange={(e) => setMailLogged(e.target.checked)} />
            I have logged the denial mail
          </label>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Penalty amount (₹, optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={penalty}
              onChange={(e) => setPenalty(e.target.value)}
              className="w-40 rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              className={danger}
              disabled={busy || !mailLogged}
              onClick={() => act("deny", { denialMailLogged: true, ...(penalty ? { penaltyAmount: penalty } : {}) })}
            >
              Confirm denial
            </button>
            <button className={secondary} disabled={busy} onClick={() => setDenying(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
