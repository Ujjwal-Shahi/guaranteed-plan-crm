"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none";

export default function NewRefundPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const body = {
      leadCode: f.get("leadCode"),
      reason: f.get("reason"),
      refundType: f.get("refundType") || undefined,
      bmAmount: f.get("bmAmount") || undefined,
      holdingAmount: f.get("holdingAmount") || undefined,
      refundAmount: f.get("refundAmount") || undefined,
    };
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to raise refund");
        setLoading(false);
        return;
      }
      router.push(`/refunds/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Raise Refund</h1>
      <p className="text-sm text-gray-500 mb-6">
        Marks the lead as cancelled and opens a refund. The call clock starts immediately.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Lead Code <span className="text-red-500">*</span>
            </label>
            <input name="leadCode" required placeholder="e.g. GP0001" className={`${inputCls} font-mono uppercase`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Refund Type</label>
            <input name="refundType" placeholder="e.g. Full / Partial" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea name="reason" required rows={3} className={inputCls} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            ["bmAmount", "BM Amount (₹)"],
            ["holdingAmount", "Holding Amount (₹)"],
            ["refundAmount", "Refund Amount (₹)"],
          ].map(([name, label]) => (
            <div key={name}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              <input name={name} type="number" min="0" step="0.01" placeholder="0.00" className={inputCls} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[#3D4FD6] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Raising…" : "Raise Refund"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
