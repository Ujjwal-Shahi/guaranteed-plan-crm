import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { getAgentLoads, getNeedsCover } from "@/lib/manpower";
import { istDayEnd, istDayStart } from "@/lib/leave";
import { SegmentBadge } from "@/components/ui/SegmentBadge";
import { AgentStatusBadge } from "@/components/manpower/AgentStatusBadge";

const IST = "Asia/Kolkata";
const WINDOW_DAYS = 14;

export default async function ManpowerPage() {
  const now = new Date();
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const d = new Date(now.getTime() + i * 86_400_000);
    const key = formatInTimeZone(d, IST, "yyyy-MM-dd");
    return {
      key,
      label: formatInTimeZone(d, IST, "dd"),
      weekday: formatInTimeZone(d, IST, "EEEEE"),
      start: istDayStart(key),
      end: istDayEnd(key),
    };
  });

  const [loads, needsCover, leaves] = await Promise.all([
    getAgentLoads(),
    getNeedsCover(),
    prisma.agentLeave.findMany({
      where: { deletedAt: null, startDate: { lte: days[days.length - 1].end }, endDate: { gte: days[0].start } },
      include: { agent: { select: { id: true, name: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const leaveByAgent = new Map<string, { id: string; name: string; ranges: { start: Date; end: Date }[] }>();
  for (const l of leaves) {
    const row = leaveByAgent.get(l.agent.id) ?? { id: l.agent.id, name: l.agent.name, ranges: [] };
    row.ranges.push({ start: l.startDate, end: l.endDate });
    leaveByAgent.set(l.agent.id, row);
  }

  const th = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Manpower</h1>
          <p className="text-sm text-gray-500 mt-0.5">{loads.length} active agents · {needsCover.length} leads need cover</p>
        </div>
        <Link href="/manpower/new" className="rounded-md bg-[#3D4FD6] px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          + Add agent
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Team load</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Agent", "Team", "Status", "Open", "Overdue", "Blocked", "Capacity used", "Backup"].map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loads.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No agents yet.</td></tr>
              )}
              {loads.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#3D4FD6]">
                    <Link href={`/manpower/${a.id}`} className="hover:underline">{a.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.team ?? "—"}</td>
                  <td className="px-4 py-3"><AgentStatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 tabular-nums">{a.open}</td>
                  <td className={`px-4 py-3 tabular-nums ${a.overdue > 0 ? "text-red-600 font-medium" : ""}`}>{a.overdue}</td>
                  <td className="px-4 py-3 tabular-nums">{a.blocked}</td>
                  <td className={`px-4 py-3 tabular-nums ${a.capacityUsedPct >= 100 ? "text-red-600 font-medium" : ""}`}>
                    {a.capacityUsedPct}% <span className="text-gray-400">({a.open}/{a.capacity})</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.backupName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Needs cover ({needsCover.length})</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>{["Lead", "Segment", "Owner", "Owner status", "Covered by"].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {needsCover.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Every open lead has an active owner.</td></tr>
              )}
              {needsCover.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-[#3D4FD6]">
                    <Link href={`/leads/${l.id}`} className="hover:underline">{l.code}</Link>
                  </td>
                  <td className="px-4 py-3"><SegmentBadge segment={l.segment} /></td>
                  <td className="px-4 py-3 text-gray-700">{l.agent?.name ?? <span className="text-red-600">Unassigned</span>}</td>
                  <td className="px-4 py-3">{l.agent ? <AgentStatusBadge status={l.agent.isActive ? l.agent.status : "EXITED"} /> : "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{l.agent?.backupAgent?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Leave calendar · next {WINDOW_DAYS} days (IST)</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[10rem]">Agent</th>
                {days.map((d) => (
                  <th key={d.key} className="px-1 py-2 text-center font-medium text-gray-500 w-8">
                    <div>{d.weekday}</div>
                    <div>{d.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaveByAgent.size === 0 && (
                <tr><td colSpan={days.length + 1} className="px-3 py-6 text-center text-gray-400">No leave planned.</td></tr>
              )}
              {Array.from(leaveByAgent.values()).map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-gray-800">
                    <Link href={`/manpower/${row.id}`} className="hover:underline">{row.name}</Link>
                  </td>
                  {days.map((d) => {
                    const on = row.ranges.some((r) => r.start <= d.end && r.end >= d.start);
                    return (
                      <td key={d.key} className="px-0.5 py-1">
                        <div className={`h-5 rounded-sm ${on ? "bg-amber-300" : "bg-gray-50"}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
