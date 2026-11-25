import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIST, formatRupees } from "@/lib/format";
import { SegmentBadge } from "@/components/ui/SegmentBadge";
import { EventTimeline } from "@/components/leads/EventTimeline";
import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import { RefundActions } from "@/components/refunds/RefundActions";

export default async function RefundDetailPage({ params }: { params: { id: string } }) {
  const refund = await prisma.refund.findFirst({
    where: { id: params.id, deletedAt: null, isActive: true },
    include: {
      lead: { select: { id: true, code: true, segment: true, agent: { select: { name: true } } } },
      events: {
        orderBy: { occurredAt: "desc" },
        take: 50,
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });
  if (!refund) notFound();

  const rows: [string, string][] = [
    ["Refund Amount", formatRupees(refund.refundAmount?.toString())],
    ["BM Amount", formatRupees(refund.bmAmount?.toString())],
    ["Holding Amount", formatRupees(refund.holdingAmount?.toString())],
    ["Penalty", formatRupees(refund.penaltyAmount?.toString())],
    ["Refund Type", refund.refundType ?? "—"],
    ["Last Call", refund.lastCallAt ? formatIST(refund.lastCallAt) : "—"],
    [
      "Next Call Due",
      refund.status === "RAISED" && refund.nextCallDueAt ? formatIST(refund.nextCallDueAt) : "—",
    ],
    ["Denial Mail Logged", refund.denialMailLoggedAt ? formatIST(refund.denialMailLoggedAt) : "—"],
    ["Initiated", refund.initiatedAt ? formatIST(refund.initiatedAt) : "—"],
    ["Credited", refund.creditedAt ? formatIST(refund.creditedAt) : "—"],
  ];

  return (
    <div className="p-6 max-w-5xl">
      <Link href="/refunds" className="text-sm text-gray-500 hover:text-[#3D4FD6]">
        ← Refunds
      </Link>
      <div className="flex items-center gap-3 mt-1 mb-1">
        <Link href={`/leads/${refund.lead.id}`} className="text-2xl font-semibold font-mono text-gray-900 hover:underline">
          {refund.lead.code}
        </Link>
        <SegmentBadge segment={refund.lead.segment} />
        <RefundStatusBadge status={refund.status} />
      </div>
      {refund.lead.agent && <p className="text-sm text-gray-500 mb-6">Owner: {refund.lead.agent.name}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Actions</h2>
            <RefundActions refundId={refund.id} status={refund.status} />
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Details</h2>
            {refund.reason && <p className="text-sm text-gray-800 mb-4">{refund.reason}</p>}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section className="bg-white rounded-lg border border-gray-200 p-5 h-fit">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity</h2>
          <EventTimeline events={refund.events} />
        </section>
      </div>
    </div>
  );
}
