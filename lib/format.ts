import { formatInTimeZone } from "date-fns-tz";

const IST = "Asia/Kolkata";

export function formatIST(date: Date | string, fmt = "dd/MM/yyyy HH:mm"): string {
  return formatInTimeZone(new Date(date), IST, fmt);
}

export function formatISTDate(date: Date | string): string {
  return formatInTimeZone(new Date(date), IST, "dd MMM yyyy");
}

export function formatRupees(amount: string | number | null | undefined): string {
  if (amount == null || amount === "") return "—";
  const n = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  return `${local[0]}***@${domain}`;
}
