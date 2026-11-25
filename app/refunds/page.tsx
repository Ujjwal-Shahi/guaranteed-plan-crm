import Link from "next/link";
import { RefundStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatIST, formatRupees } from "@/lib/format";
import { RefundStatusBadge, REFUND_STATUS_LABELS } from "@/components/refunds/RefundStatusBadge";

const PAGE_SIZE = 25;

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string; queue?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const callsDue = searchParams.queue === "calls-due";
  const status = Object.values(RefundStatus).includes(searchParams.status as RefundStatus)
    ? (searchParams.status as RefundStatus)
    : undefined;
  const now = new Date();

  const where = {
    deletedAt: null as null,
    isActive: true,
    ...(callsDue
      ? { status: RefundStatus.RAISED, nextCallDueAt: { lte: now } }
      : status
      ? { status }
      : {}),
  };

  const [refunds, total, callsDueCount] = await Promise.all([
    prisma.refund.findMany({
      where,
      orderBy: callsDue ? { nextCallDueAt: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { lead: { select: { id: true, code: true, agent: { select: { name: true } } } } },
    }),
    prisma.refund.count({ where }),
    prisma.refund.count({
      where: { deletedAt: null, isActive: true, status: RefundStatus.RAISED, nextCallDueAt: { lte: now } },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm ${
        active ? "bg-[#3D4FD6] text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Refunds</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} shown</p>
        </div>
        <Link
          href="/refunds/new"
          className="rounded-md bg-[#3D4FD6] px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Raise Refund
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {tab("All", "/refunds", !callsDue && !status)}
        {tab(`Calls due (${callsDueCount})`, "/refunds?queue=calls-due", callsDue)}
        {Object.values(RefundStatus).map((s) =>
          tab(REFUND_STATUS_LABELS[s], `/refunds?status=${s}`, !callsDue && status === s)
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Lead", "Status", "Reason", "Refund Amount", "Owner", "Next Call Due"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {refunds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No refunds found.
                </td>
              </tr>
            ) : (
              refunds.map((r) => {
                const overdue = r.status === "RAISED" && r.nextCallDueAt && r.nextCallDueAt <= now;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-[#3D4FD6]">
                      <Link href={`/refunds/${r.id}`} className="hover:underline">
                        {r.lead.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><RefundStatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{r.reason ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{formatRupees(r.refundAmount?.toString())}</td>
                    <td className="px-4 py-3 text-gray-700">{r.lead.agent?.name ?? "—"}</td>
                    <td className={`px-4 py-3 ${overdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                      {r.status === "RAISED" && r.nextCallDueAt ? formatIST(r.nextCallDueAt) : "—"}
                      {overdue && " · overdue"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {[page - 1, page + 1]
              .filter((p) => p >= 1 && p <= totalPages)
              .map((p) => {
                const qs = new URLSearchParams();
                qs.set("page", String(p));
                if (callsDue) qs.set("queue", "calls-due");
                if (status) qs.set("status", status);
                return (
                  <Link key={p} href={`/refunds?${qs}`} className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">
                    {p < page ? "← Prev" : "Next →"}
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
