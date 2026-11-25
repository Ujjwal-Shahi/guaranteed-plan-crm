// Indian public holidays — Bangalore, FY 2024-25 and FY 2025-26
// Source: NoBroker HR calendar (update each FY before go-live)
// Format: YYYY-MM-DD in UTC (dates apply regardless of TZ offset)

export const HOLIDAYS: Set<string> = new Set([
  // FY 2024-25 (Apr 2024 – Mar 2025)
  "2024-04-14", // Dr. Ambedkar Jayanti / Tamil New Year
  "2024-04-17", // Ram Navami
  "2024-04-21", // Mahavir Jayanti (optional, check HR)
  "2024-04-23", // Ugadi / Telugu New Year
  "2024-05-23", // Buddha Purnima
  "2024-06-17", // Bakrid / Eid al-Adha
  "2024-07-17", // Muharram
  "2024-08-15", // Independence Day
  "2024-08-26", // Janmashtami
  "2024-09-16", // Milad-un-Nabi
  "2024-10-02", // Gandhi Jayanti
  "2024-10-12", // Dussehra (Vijayadasami)
  "2024-11-01", // Kannada Rajyotsava
  "2024-11-15", // Diwali (Naraka Chaturdashi)
  "2024-12-25", // Christmas
  "2025-01-01", // New Year's Day
  "2025-01-14", // Pongal / Sankranti
  "2025-01-26", // Republic Day
  "2025-02-26", // Maha Shivaratri
  "2025-03-14", // Holi (verify — Karnataka may differ)
  "2025-03-31", // Id-ul-Fitr (Eid al-Fitr)

  // FY 2025-26 (Apr 2025 – Mar 2026)
  "2025-04-10", // Ram Navami
  "2025-04-13", // Ugadi
  "2025-04-14", // Dr. Ambedkar Jayanti
  "2025-05-12", // Buddha Purnima
  "2025-06-07", // Bakrid (Eid al-Adha)
  "2025-07-06", // Muharram
  "2025-08-15", // Independence Day
  "2025-08-16", // Janmashtami
  "2025-09-05", // Ganesh Chaturthi (Bangalore optional)
  "2025-10-02", // Gandhi Jayanti
  "2025-11-01", // Kannada Rajyotsava
  "2025-10-20", // Diwali (Naraka Chaturdashi — verify exact date)
  "2025-12-25", // Christmas
  "2026-01-01", // New Year's Day
  "2026-01-14", // Pongal / Sankranti
  "2026-01-26", // Republic Day
  "2026-02-26", // Maha Shivaratri (approximate)
  "2026-03-20", // Holi (approximate — verify with HR)
]);

/** Returns true if the given UTC date falls on an Indian public holiday. */
export function isHoliday(date: Date): boolean {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return HOLIDAYS.has(`${y}-${m}-${d}`);
}
