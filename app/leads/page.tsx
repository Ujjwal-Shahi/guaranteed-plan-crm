import Link from "next/link";
import { prisma } from "@/lib/db";
import { LeadSegment, LeadStatus, SlaStatus } from "@prisma/client";
import { formatISTDate, formatRupees } from "@/lib/format";
import { SegmentBadge, SEGMENT_LABELS } from "@/components/ui/SegmentBadge";
import { LeadStatusBadge, SlaStatusPill } from "@/components/ui/StatusPill";

const PAGE_SIZE = 25;

interface SearchParams {
  page?: string;
  segment?: string;
  status?: string;
  q?: string;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const segment = searchParams.segment as LeadSegment | undefined;
  const status = searchParams.status as LeadStatus | undefined;
  const q = searchParams.q;

  const where = {
    deletedAt: null as null,
    isActive: true,
    ...(segment && Object.values(LeadSegment).includes(segment) ? { segment } : {}),
    ...(status && Object.values(LeadStatus).includes(status) ? { status } : {}),
    ...(q ? { code: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        agent: { select: { name: true } },
        slaClocks: {
          where: { deletedAt: null },
          select: { status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        <Link
          href="/leads/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-[#3D4FD6] px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          + New Lead
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search code…"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#3D4FD6] focus:outline-none w-40"
        />
        <select
          name="segment"
          defaultValue={segment ?? ""}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#3D4FD6] focus:outline-none"
        >
          <option value="">All Segments</option>
          {Object.values(LeadSegment).map((s) => (
            <option key={s} value={s}>{SEGMENT_LABELS[s]}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#3D4FD6] focus:outline-none"
        >
          <option value="">All Statuses</option>
          {Object.values(LeadStatus).map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Filter
        </button>
        {(q || segment || status) && (
          <Link href="/leads" className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50">
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deal Value</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                  No leads found.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const topSla = lead.slaClocks[0]?.status as SlaStatus | undefined;
                return (
                  <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-mono font-medium text-[#3D4FD6]">
                      <Link href={`/leads/${lead.id}`} className="hover:underline">
                        {lead.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <SegmentBadge segment={lead.segment} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-900">
                      {formatRupees(lead.dealValue.toString())}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {lead.agent?.name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3">
                      {topSla ? <SlaStatusPill status={topSla} /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatISTDate(lead.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/leads?page=${page - 1}${segment ? `&segment=${segment}` : ""}${status ? `&status=${status}` : ""}${q ? `&q=${q}` : ""}`}
                className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/leads?page=${page + 1}${segment ? `&segment=${segment}` : ""}${status ? `&status=${status}` : ""}${q ? `&q=${q}` : ""}`}
                className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
