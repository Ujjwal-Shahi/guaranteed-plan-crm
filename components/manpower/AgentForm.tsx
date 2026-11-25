"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none";

interface Props {
  mode: "create" | "edit";
  agentId?: string;
  backups: { id: string; name: string }[];
  initial?: {
    name: string;
    email: string;
    noBrokerLogin: string | null;
    team: string | null;
    role: string | null;
    capacity: number;
    backupAgentId: string | null;
  };
}

export function AgentForm({ mode, agentId, backups, initial }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      name: f.get("name"),
      noBrokerLogin: f.get("noBrokerLogin"),
      team: f.get("team"),
      role: f.get("role"),
      capacity: Number(f.get("capacity")),
      backupAgentId: f.get("backupAgentId"),
    };
    if (mode === "create") body.email = f.get("email");

    try {
      const res = await fetch(mode === "create" ? "/api/agents" : `/api/agents/${agentId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save agent");
      } else if (mode === "create") {
        router.push(`/manpower/${data.id}`);
        return;
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input name="name" required defaultValue={initial?.name} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
          <input
            name="email"
            type="email"
            required
            disabled={mode === "edit"}
            defaultValue={initial?.email}
            className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-500`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">NoBroker login</label>
          <input name="noBrokerLogin" defaultValue={initial?.noBrokerLogin ?? ""} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Capacity (max open leads) *</label>
          <input name="capacity" type="number" min="1" required defaultValue={initial?.capacity ?? 50} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Team</label>
          <input name="team" defaultValue={initial?.team ?? ""} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
          <input name="role" defaultValue={initial?.role ?? ""} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Backup agent</label>
          <select name="backupAgentId" defaultValue={initial?.backupAgentId ?? ""} className={inputCls}>
            <option value="">None</option>
            {backups.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[#3D4FD6] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : mode === "create" ? "Add agent" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-green-700">Saved.</span>}
      </div>
    </form>
  );
}
