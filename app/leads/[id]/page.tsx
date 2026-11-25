import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatISTDate, formatIST, formatRupees } from "@/lib/format";
import { SegmentBadge } from "@/components/ui/SegmentBadge";
import { LeadStatusBadge, SlaStatusPill } from "@/components/ui/StatusPill";
import { EventTimeline } from "@/components/leads/EventTimeline";

const STAGE_LABELS: { field: string; label: string }[] = [
  { field: "obCompletedAt", label: "Onboarding Completed" },
  { field: "docsCollectedAt", label: "Documents Collected" },
  { field: "ddpPrDoneAt", label: "DDP PR Report" },
  { field: "ddpFinalDoneAt", label: "DDP Final Report" },
  { field: "saDetailsSharedAt", label: "SA Details Shared" },
  { field: "saDraftDoneAt", label: "SA Draft Done" },
  { field: "saSignedAt", label: "Sale Agreement Signed" },
  { field: "loanSaSharedAt", label: "Loan SA Shared" },
  { field: "loanDdReceivedAt", label: "Loan DD Received" },
  { field: "sdDraftDoneAt", label: "SD Draft Done" },
  { field: "registeredAt", label: "Registered" },
];

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await prisma.lead.findFirst({
    where: { id: params.id, deletedAt: null, isActive: true },
    include: {
      agent: { select: { id: true, name: true, team: true } },
      slaClocks: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      refunds: {
        where: { deletedAt: null, isActive: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      events: {
        take: 50,
        orderBy: { occurredAt: "desc" },
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });

  if (!lead) notFound();

  const stageRecord = lead as unknown as Record<string, Date | null>;

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/leads" className="text-sm text-gray-500 hover:text-[#3D4FD6]">
              ← Leads
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold font-mono text-gray-900">{lead.code}</h1>
            <SegmentBadge segment={lead.segment} />
            <LeadStatusBadge status={lead.status} />
          </div>
          {lead.agent && (
            <p className="text-sm text-gray-500 mt-1">
              Owner: <span className="font-medium text-gray-700">{lead.agent.name}</span>
              {lead.agent.team && <span className="text-gray-400"> · {lead.agent.team}</span>}
            </p>
          )}
        </div>
        <Link
          href={`/leads/${lead.id}/edit`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Deal terms + Pipeline */}
        <div className="col-span-2 space-y-5">
          {/* Deal terms */}
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Deal Terms</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Deal Value</dt>
                <dd className="font-medium text-gray-900">{formatRupees(lead.dealValue.toString())}</dd>
              </div>
              {lead.pfcAmount && (
                <div>
                  <dt className="text-gray-500">PFC Amount</dt>
                  <dd className="font-medium text-gray-900">{formatRupees(lead.pfcAmount.toString())}</dd>
                </div>
              )}
              {lead.tokenAmount && (
                <div>
                  <dt className="text-gray-500">Token Amount</dt>
                  <dd className="font-medium text-gray-900">{formatRupees(lead.tokenAmount.toString())}</dd>
                </div>
              )}
              {lead.tdsAmount && (
                <div>
                  <dt className="text-gray-500">TDS Amount</dt>
                  <dd className="font-medium text-gray-900">{formatRupees(lead.tdsAmount.toString())}</dd>
                </div>
              )}
              {lead.promiseTatDays && (
                <div>
                  <dt className="text-gray-500">Promise TAT</dt>
                  <dd className="font-medium text-gray-900">{lead.promiseTatDays} working days</dd>
                </div>
              )}
              {lead.sellerName && (
                <div>
                  <dt className="text-gray-500">Seller</dt>
                  <dd className="font-medium text-gray-900">{lead.sellerName}</dd>
                </div>
              )}
              {lead.buyerName && (
                <div>
                  <dt className="text-gray-500">Buyer</dt>
                  <dd className="font-medium text-gray-900">{lead.buyerName}</dd>
                </div>
              )}
              {lead.propertyAddress && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Property</dt>
                  <dd className="font-medium text-gray-900">
                    {lead.propertyAddress}
                    {lead.propertyCity && <span className="text-gray-500">, {lead.propertyCity}</span>}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Pipeline stages */}
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline Stages</h2>
            <ul className="space-y-2.5">
              {STAGE_LABELS.map(({ field, label }) => {
                const date = stageRecord[field] as Date | null;
                const done = date != null;
                return (
                  <li key={field} className="flex items-center gap-3 text-sm">
                    <span
                      className={`h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center ${
                        done ? "bg-green-500" : "bg-gray-200"
                      }`}
                    >
                      {done && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={done ? "text-gray-900" : "text-gray-400"}>{label}</span>
                    {done && (
                      <span className="ml-auto text-xs text-gray-400">{formatISTDate(date!)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* SLA Clocks */}
          {lead.slaClocks.length > 0 && (
            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">SLA Clocks</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2">Clock</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2">Started</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2">Due</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lead.slaClocks.map((clock) => (
                    <tr key={clock.id}>
                      <td className="py-2 font-mono text-xs text-gray-700">{clock.clockType}</td>
                      <td className="py-2"><SlaStatusPill status={clock.status} /></td>
                      <td className="py-2 text-gray-500">{formatIST(clock.startedAt)}</td>
                      <td className="py-2 text-gray-500">{formatIST(clock.dueAt)}</td>
                      <td className="py-2 text-gray-500">
                        {clock.completedAt ? formatIST(clock.completedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {/* Right: Event timeline */}
        <div>
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity</h2>
            <EventTimeline events={lead.events} />
          </section>

          <div className="mt-3 text-xs text-gray-400 text-center">
            Created {formatIST(lead.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
