export interface AssignmentTarget {
  id: string;
  load: number;
  capacity: number;
}

export interface AssignmentResult {
  assignments: { leadId: string; toAgentId: string }[];
  perTarget: { agentId: string; assigned: number; loadAfter: number; capacity: number; overCapacity: boolean }[];
}

/** Spreads leads one by one onto the currently least-loaded target. Ties go to the earlier target. */
export function distributeLeads(leadIds: string[], targets: AssignmentTarget[]): AssignmentResult {
  const state = targets.map((t) => ({ ...t, assigned: 0 }));
  const assignments: AssignmentResult["assignments"] = [];

  if (state.length > 0) {
    for (const leadId of leadIds) {
      let best = state[0];
      for (const s of state) {
        if (s.load + s.assigned < best.load + best.assigned) best = s;
      }
      best.assigned++;
      assignments.push({ leadId, toAgentId: best.id });
    }
  }

  return {
    assignments,
    perTarget: state.map((s) => ({
      agentId: s.id,
      assigned: s.assigned,
      loadAfter: s.load + s.assigned,
      capacity: s.capacity,
      overCapacity: s.load + s.assigned > s.capacity,
    })),
  };
}
