import { isHoliday } from "./holidays";

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

function isWorkingDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

function addOneDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

/**
 * Returns the date that is `days` working days after `start`.
 * The start day itself is NOT counted — clocks begin on the first
 * working day after the start event.
 */
export function workingDaysFrom(start: Date, days: number): Date {
  if (days <= 0) return start;
  let current = addOneDay(start);
  let counted = 0;
  while (counted < days) {
    if (isWorkingDay(current)) {
      counted++;
      if (counted < days) current = addOneDay(current);
    } else {
      current = addOneDay(current);
    }
  }
  return current;
}

/**
 * Returns the number of working days between `start` and `end`.
 * Counts days strictly after `start` and up to and including `end`.
 */
export function workingDaysBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let count = 0;
  let current = addOneDay(start);
  while (current <= end) {
    if (isWorkingDay(current)) count++;
    current = addOneDay(current);
  }
  return count;
}

/** SLA clock types and their working-day budgets */
export const SLA_BUDGETS: Record<string, number> = {
  OB: 0, // promise TAT set per lead
  DOCS_COLLECTION: 5,
  DDP_PR: 3,
  DDP_FINAL: 7,
  SA_DRAFT: 2,
  SA_SIGNING: 5,
  LOAN_DD: 15,
  SD_DRAFT: 2,
  REGISTRATION: 1,
  REFUND_CALL: 2,
  REFUND_INITIATION: 7,
};

/** Working-days before dueAt when status flips to DUE_SOON */
export const DUE_SOON_THRESHOLD = 1;
