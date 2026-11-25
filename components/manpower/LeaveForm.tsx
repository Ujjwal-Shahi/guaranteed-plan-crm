"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls = "rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none";

export function LeaveForm({ agentId, backups }: { agentId: string; backups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const res = await fetch(`/api/agents/${agentId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: f.get("startDate"),
          endDate: f.get("endDate"),
          backupId: f.get("backupId"),
          reason: f.get("reason"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to mark leave");
      } else {
        form.reset();
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">From *</label>
          <input name="startDate" type="date" required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">To *</label>
          <input name="endDate" type="date" required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Backup</label>
          <select name="backupId" defaultValue="" className={inputCls}>
            <option value="">None</option>
            {backups.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
          <input name="reason" className={`${inputCls} w-full`} />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[#3D4FD6] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Mark leave"}
        </button>
      </div>
    </form>
  );
}
