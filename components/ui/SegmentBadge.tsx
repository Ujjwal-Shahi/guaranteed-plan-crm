import { LeadSegment } from "@prisma/client";

export const SEGMENT_LABELS: Record<LeadSegment, string> = {
  GP_SOCIETY: "GP/Society",
  BAPS_SOCIETY: "BAPS Society",
  SSPP_POSTPAID: "Post Paid",
  PLOT: "Plot",
  BMBA_BM: "BM",
  BMHV_BM_1L: "BM >1L",
};

const SEGMENT_CLASSES: Record<LeadSegment, string> = {
  GP_SOCIETY: "bg-indigo-50 text-indigo-700",
  BAPS_SOCIETY: "bg-purple-50 text-purple-700",
  SSPP_POSTPAID: "bg-cyan-50 text-cyan-700",
  PLOT: "bg-orange-50 text-orange-700",
  BMBA_BM: "bg-teal-50 text-teal-700",
  BMHV_BM_1L: "bg-rose-50 text-rose-700",
};

export function SegmentBadge({ segment }: { segment: LeadSegment }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${SEGMENT_CLASSES[segment]}`}
    >
      {SEGMENT_LABELS[segment]}
    </span>
  );
}
