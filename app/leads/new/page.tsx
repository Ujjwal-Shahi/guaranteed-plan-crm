"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LeadSegment } from "@prisma/client";
import { SEGMENT_LABELS } from "@/components/ui/SegmentBadge";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      code: form.get("code"),
      segment: form.get("segment"),
      dealValue: form.get("dealValue"),
      promiseTatDays: form.get("promiseTatDays") ? Number(form.get("promiseTatDays")) : undefined,
      pfcAmount: form.get("pfcAmount") || undefined,
      tokenAmount: form.get("tokenAmount") || undefined,
      tdsAmount: form.get("tdsAmount") || undefined,
      sellerName: form.get("sellerName") || undefined,
      buyerName: form.get("buyerName") || undefined,
      propertyAddress: form.get("propertyAddress") || undefined,
      propertyCity: form.get("propertyCity") || undefined,
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create lead");
        setLoading(false);
        return;
      }
      router.push(`/leads/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">New Lead</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a new lead record.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Lead Code <span className="text-red-500">*</span>
            </label>
            <input
              name="code"
              required
              placeholder="e.g. GP0001"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-[#3D4FD6] focus:outline-none uppercase"
              style={{ textTransform: "uppercase" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Segment <span className="text-red-500">*</span>
            </label>
            <select
              name="segment"
              required
              defaultValue=""
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none"
            >
              <option value="" disabled>Select…</option>
              {Object.values(LeadSegment).map((s) => (
                <option key={s} value={s}>{SEGMENT_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Deal Value (₹) <span className="text-red-500">*</span>
          </label>
          <input
            name="dealValue"
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">PFC Amount (₹)</label>
            <input
              name="pfcAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Token Amount (₹)</label>
            <input
              name="tokenAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">TDS Amount (₹)</label>
            <input
              name="tdsAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Promise TAT (working days)</label>
          <input
            name="promiseTatDays"
            type="number"
            min="1"
            placeholder="e.g. 30"
            className="w-32 rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Seller Name</label>
            <input
              name="sellerName"
              placeholder="Seller full name"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buyer Name</label>
            <input
              name="buyerName"
              placeholder="Buyer full name"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Property Address</label>
          <input
            name="propertyAddress"
            placeholder="Flat / house / plot address"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
          <input
            name="propertyCity"
            placeholder="e.g. Bengaluru"
            className="w-48 rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#3D4FD6] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[#3D4FD6] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Creating…" : "Create Lead"}
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
