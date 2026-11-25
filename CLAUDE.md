# CLAUDE.md — NoBroker Monetisation CRM

> **Read this file completely before writing a single line of code.**
> These rules are non-negotiable. If a task seems to require breaking one of them, stop and ask.

---

## 1. The One-Line Mission

**CRM tracks. NoBroker systems do the work.**

The CRM records what happened and when. It does not replace any NoBroker workflow (mail, ticketing, payments). It does not write back to the Google Sheets — the sheet is a one-way mirror (CRM → Sheet).

---

## 2. Absolute Rules

### 2.1 Never hard-delete
Every table that holds business data has `deleted_at TIMESTAMPTZ` and/or `is_active BOOLEAN`.
Deletes are soft. `SELECT` queries must filter `WHERE deleted_at IS NULL` or `WHERE is_active = true`.
No `DELETE FROM` on business tables. Ever.

### 2.2 Every write emits an event
Any INSERT or UPDATE to `leads`, `service_tasks`, `refunds`, `agents`, or `agent_leave` must also insert a row into the `events` table:

```ts
// lib/events.ts
export async function emitEvent(
  tx: PrismaTransaction,
  opts: { leadId?: string; actorId: string; eventType: string; payload: object }
) {
  await tx.event.create({ data: { ...opts, occurredAt: new Date() } });
}
```

Call `emitEvent` inside the same Prisma transaction as the write. If the event insert fails, the whole transaction rolls back.

### 2.3 IST everywhere
- **Store:** UTC in Postgres (`TIMESTAMPTZ`).
- **Display:** `Asia/Kolkata` in all UI labels, emails, and log messages.
- **Never** store IST offsets in the database.
- Use `date-fns-tz` with `'Asia/Kolkata'` for all formatting.
- Cloud Run `TZ=Asia/Kolkata` env var is set, but always be explicit in code.

### 2.4 Money in Rupees, never floats
All monetary columns are `NUMERIC(14,2)` in Postgres and `Decimal` in Prisma.
Never use JavaScript `number` for money. Use the `Decimal` type from Prisma's runtime throughout.
Display as `₹X,XX,XXX` (Indian number format).

### 2.5 No customer PII in logs, demos, or console output
- Emails: show `a***@domain.com` only.
- Advocate names: show initials only in logs.
- Phone numbers: never log.
- The seed file (`leads_seed.json`) already has masked data — do not add real data to it.
- The demo/prototype never shows real data.

### 2.6 dueAt is immutable
Once a `SLAClock.dueAt` is set (when `startedAt` is recorded), **it never changes**, even if the lead or task is updated.
The SLA engine reads `dueAt` to compute status; it never rewrites it.

### 2.7 Sheets are a one-way mirror
`jobs/sheets-mirror.ts` writes CRM data to the Google Sheets.
Nothing reads from the sheet back into the CRM database.
If the sheet and the CRM disagree, the CRM is correct.

---

## 3. Tech Stack (don't change without a decision record)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router + TypeScript | SSR + API routes in one repo |
| Styling | Tailwind CSS | Utility-first; indigo `#3D4FD6` accent, Inter font |
| ORM | Prisma | Type-safe; migrations tracked in `prisma/migrations/` |
| Database | Cloud SQL PostgreSQL 15 (asia-south1) | Durable, managed, event-sourced |
| Auth | NextAuth.js (Google OAuth) + IAP | NoBroker Workspace accounts only |
| Hosting | Cloud Run | Serverless; scales to zero for pilot |
| SLA engine | Cloud Run Job + Cloud Scheduler (every 5 min) | Stateless; idempotent |
| Sheets mirror | Cloud Run Job + Cloud Scheduler (every 10 min) | Delta sync |
| Testing | Vitest + Playwright | Unit + E2E |
| CI/CD | GitHub Actions → Cloud Build → Cloud Run | |

---

## 4. Data Model Rules

### Lead codes
Format: `{PREFIX}{NUMBER}` — e.g. `GP0001`, `BMBA1023`.

| Prefix | Segment |
|---|---|
| GP | GP || Society |
| BAPS | Society |
| SSPP | Post paid |
| Plot | Plot |
| BMBA | BM Sheet |
| BMHV | BM(>1L) |

- Codes are **unique** after deduplication. The 30 known duplicates get a `-A`/`-B` suffix (confirm with team).
- Code is **not** the spreadsheet row number.

### Status pills
| Status | Meaning |
|---|---|
| `ON_TRACK` | Working days remaining > due-soon threshold |
| `DUE_SOON` | 1 working day or less until `dueAt` |
| `OVERDUE` | Past `dueAt`, no blocking dependency |
| `BLOCKED` | Past `dueAt`, dependency recorded in `blockedBy` |
| `DONE` | `completedAt` is set |

---

## 5. SLA Working-Day Calculator

The file `lib/sla.ts` must implement:

```ts
export function workingDaysFrom(start: Date, days: number): Date
export function workingDaysBetween(start: Date, end: Date): number
```

Working days skip: Saturday, Sunday, and Indian public holidays.
The holiday list is in `lib/holidays.ts` — keep it up to date for the current financial year.

---

## 6. Repo Layout

```
/
├── app/                    # Next.js App Router
│   ├── (auth)/
│   ├── dashboard/
│   ├── leads/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── refunds/page.tsx
│   ├── manpower/page.tsx
│   └── api/
│       ├── leads/
│       ├── sla/
│       ├── refunds/
│       └── agents/
├── components/
│   ├── ui/
│   ├── leads/
│   ├── sla/
│   └── charts/
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── sla.ts              # Working-day calculator
│   ├── holidays.ts         # Indian public holidays
│   ├── events.ts           # emitEvent() helper
│   ├── sheets.ts           # Sheets mirror writer
│   └── auth.ts             # NextAuth config + IAP middleware
├── jobs/
│   ├── sla-engine.ts       # Runs every 5 min
│   └── sheets-mirror.ts    # Runs every 10 min
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── unit/               # Vitest
│   └── e2e/                # Playwright
├── scripts/
│   └── seed.ts             # Seeds from leads_seed.json (masked data)
├── CLAUDE.md               # ← this file
└── cloudbuild.yaml
```

---

## 7. Environment Variables

Never commit secrets. All live in Cloud Run environment / Secret Manager.

```env
DATABASE_URL=postgresql://...@/crm?host=/cloudsql/PROJECT:REGION:INSTANCE
NEXTAUTH_SECRET=<random-32-bytes>
NEXTAUTH_URL=https://crm.nobroker.in
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ALLOWED_DOMAIN=nobroker.in
SHEETS_SPREADSHEET_ID_SOCIETY=
SHEETS_SPREADSHEET_ID_BUYER=
GOOGLE_SERVICE_ACCOUNT_KEY=   # JSON key for Sheets API + Cloud SQL
TZ=Asia/Kolkata
```

---

## 8. Build Order (follow this sequence)

1. **M0 — Infra:** Next.js skeleton → Prisma schema → first migration → Cloud SQL → NextAuth + IAP → Cloud Run deploy → `/api/health` returns 200.
2. **M1 — Lead CRUD:** POST / GET / PATCH `/api/leads`; lead list page; lead detail + event timeline.
3. **M2 — SLA engine:** `lib/sla.ts`; `jobs/sla-engine.ts`; Cloud Scheduler; status pills on lead detail.
4. **M3 — Refund tracker:** Refund CRUD; call-due queue; denial flow.
5. **M4 — Manpower:** Agent CRUD (soft-deactivate only); leave calendar; bulk reassign open leads.
6. **M5 — Sheets mirror:** `jobs/sheets-mirror.ts`; Cloud Scheduler every 10 min.
7. **M6 — Dashboard & reports:** KPI tiles; stage funnel; RM-wise pending mail reverts; Gantt-style project view.
8. **M7 — Polish:** Seed script; Playwright e2e; responsive audit; UAT handoff.

---

## 9. Test Requirements

- **Unit (Vitest):** `workingDaysFrom`, `workingDaysBetween`, `emitEvent`, SLA status transitions.
- **Integration:** API route happy paths + validation errors (400, 401, 404).
- **E2E (Playwright):** Create lead → start DDP → SLA overdue → resolve; Refund denial flow; Agent leave + backup assignment.
- **Coverage target:** ≥ 70% on `lib/` and `jobs/`.

---

## 10. Open Questions — Get Answers Before Coding

| # | Question | Who |
|---|---|---|
| 1 | Indian public holidays list (FY 2024-25 and 2025-26) | Team |
| 2 | "Due soon" threshold — how many working days before dueAt? (Suggested: 1) | PM |
| 3 | Mail integration — NoBroker Workspace Gmail? Service-account scope? | IT |
| 4 | Sheets spreadsheet IDs (Society and Buyer workbooks) | Team |
| 5 | GCP project ID and region (confirm asia-south1) | IT |
| 6 | Duplicate lead code suffix strategy (append -A/-B?) | Team |

---

## 11. What NOT to Do

- Do not add a `DELETE` route for any business entity.
- Do not write to the Google Sheets from anywhere except `jobs/sheets-mirror.ts`.
- Do not read from the Google Sheets into the CRM database.
- Do not log customer email addresses or phone numbers.
- Do not store IST-offset datetimes in the database.
- Do not use `number` for currency calculations.
- Do not change `dueAt` after it is set.
- Do not create a lead without emitting a `LEAD_CREATED` event.
- Do not deploy to a personal GCP account — use the NoBroker organisation project.

---

*Last updated: 2026-11-25 | PRD: https://claude.ai/artifact/Sc8Y9M5xQ1PPUV37WWqAJp*
