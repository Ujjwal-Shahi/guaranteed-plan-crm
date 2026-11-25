# PRD — Monetisation Servicing CRM

Nov 25, 2026 · @Ujjwal Shahi

## 1. Summary

We will replace the two servicing workbooks (Society/Postpaid and Buyer Monetisation) with an internal CRM where every write lands in a database first, every lead's TAT is tracked live, and the sheet becomes a read-only mirror. v1 covers the servicing pipeline, SLA tracking, mail reverts, refunds, manpower and reporting.

**Problem.** About 5,000 leads live across 60+ tabs. The same lead is copied across segment tabs, TATs are hand-maintained formulas, Apps Script hits its limits, and there is no record of who changed what. Leads go overdue silently, and work stalls when an RM is on leave or leaves.

**Goals**

1. Zero data loss: every create and edit is saved in the CRM and logged with who and when.
2. Live status for every lead: on track, due, overdue, blocked, with the reason.
3. One place for lead intake, servicing, mail reverts, refunds and tickets.
4. No lead without an active owner, even when RMs are on leave or exit.
5. Reports that build themselves from the data.

**Guiding principle: the CRM tracks, NoBroker systems do the work**

Nothing that already works inside NoBroker is replaced. Mails are still sent and received from NoBroker mail, tickets stay in NoBroker ticketing, payments and refunds still move through NoBroker's existing finance process. The CRM only records what happened, tracks it against TAT, and links back to the source.

| Activity | Done in (unchanged) | CRM's job |
| --- | --- | --- |
| Sending and replying to mail | NoBroker mail | Link the thread to the lead; record sent / received / replied times and who replied; flag pending reverts |
| Tickets | NoBroker ticketing | Store the ticket ID on the lead; show its status; link to open it |
| Token, PFC, payments, refunds | NoBroker payment / finance process | Record amounts, dates and status; track refund TATs |
| Lead source data | Existing NoBroker forms and sheets | Import and track; no change to how leads arrive |
| Legal work (DDP, SA, SD) | Advocates, as today | Record dates and dependencies; run the clocks |

**Out of scope (v1):** a customer-facing portal or app; sending mail or collecting payments from inside the CRM; editing the current production sheets before cutover.

**Definition of done for v1.** The team runs a full month in the CRM with the sheet as mirror only, no lost records, and every TAT in section 5 tracked automatically.

## 2. Users & personas

| Persona | Who today | Main job in the CRM | Sees | Can change |
| --- | --- | --- | --- | --- |
| RM / servicing agent | Tejiswini, Farida, Dilana and others (18 in the sample) | Work their book: mark stages, call, reply to mail | Own leads, own queue | Own leads' stages, notes, mails |
| Team lead | Servicing team leads | Keep TATs green, rebalance work, approve exceptions | All leads in their team | Reassign, approve refunds, set agent status |
| Legal / DDP advocate | Ganapathy, Shiva Kumar and others | Deliver PR and final reports on time | Leads assigned to them | DDP dates, report status, dependency notes |
| Loan team | Loan RMs | Turn the shared sale agreement into a DD | Leads with SA shared | Loan state, DD received date |
| Refund desk | Refund owners | Run cancellations to credit or recovery | Refund-track leads | Refund state, amounts, mails |
| Ops admin | You | Set rules, users, holidays; run imports and sync | Everything | SLA config, users, data imports |

One person can hold more than one role. Access is by role, never by sharing a file.

## 3. Scope

| Module | v1 (pilot) | Later |
| --- | --- | --- |
| M1 Lead intake | Create lead with deal value, PFC, token, TDS, promise TAT; duplicate check; segment | Bulk import from forms |
| M2 Servicing pipeline | OB, DDP (PR + final), SA draft/sign, loan DD, SD draft, registration; dates and status per stage | Per-city stage variants |
| M3 SLA engine | Working-day clocks, due/overdue/blocked, dependency reason, holiday calendar | Configurable rules UI |
| M4 Upsell | Interior pitched and referral asked, on every lead | Interior pipeline tracking |
| M5 Mail & calls | Link NoBroker mail threads and calls to the lead; pending-revert queue RM-wise; who replied, when | Automatic capture of NoBroker mail events (if API access is granted) |
| M6 Refunds | Cancellation, refund form, 2-day call cadence, 7-day initiation, deny path with token recovery and penalty, status to credit | Finance system link |
| M7 Tickets | Ticket ID on lead; status shown | Live status sync by API |
| M8 Manpower | Agent status (active, on leave, exited), cover queue, bulk reassign, load view | Auto-assignment rules |
| M9 Reports | Dashboard, RM scorecard, SLA compliance, refund and mail queues | Scheduled email reports |
| M10 Audit & sync | Event log on every change; sheet mirror updated from CRM; CSV export | Two-way reconciliation report |

**M11 Project view** (section 5a): lead Gantt, flow board and lead timeline in v1; forecast dates, bottleneck heatmap and delay attribution in v1 after pilot; critical path later.

Modules M1–M3, M8, M10 and the M11 flow board are the minimum for a pilot; the rest can follow inside v1.

## 4. Use cases & user stories

Each story has a test that tells us it works. P0 = needed for pilot, P1 = needed for go-live, P2 = later.

### M1 Lead intake

| ID | Story | Acceptance criteria | Priority |
| --- | --- | --- | --- |
| US-01 | As an RM, I add a new lead with deal value, PFC, token, TDS and promise TAT, so servicing starts with the deal terms in one place. | Lead is saved before the form closes; required fields enforced; lead appears in the owner's queue within 5 s; event `lead_created` logged with user and time. | P0 |
| US-02 | As an RM, I'm warned if the buyer or seller already has a lead, so we don't create duplicates. | Matching email or phone shows the existing lead code; creating anyway needs a reason. | P0 |
| US-03 | As an ops admin, I import leads from the old sheet, so history is not lost. | Import report shows rows read, created, updated, rejected with reason; rows with invalid codes (e.g. a note typed into the Code column) are rejected, not silently dropped. | P0 |

### M2 Servicing pipeline

| ID | Story | Acceptance criteria | Priority |
| --- | --- | --- | --- |
| US-04 | As an RM, I mark OB complete, so the next stage starts. | One click sets the OB date to today (editable); stage moves to Docs; clock for docs starts. | P0 |
| US-05 | As an RM, I see a discrepancy flag at OB, so wrong deal data is caught early. | Flag when token + balance ≠ deal value, or required OB fields are empty; flag stays until resolved or overridden with a reason. | P0 |
| US-06 | As an advocate, I record docs collected, PR report and final report dates, so DDP TAT is tracked. | Docs-collected date = DDP initiation; PR due at +3 working days, final at +7; late final report with a dependency shows as Blocked with the reason. | P0 |
| US-07 | As an RM, I record SA details shared, draft and signing, so the agreement stays on time. | Draft due at +2 days and signing at +5 days from details-shared date. | P0 |
| US-08 | As a loan RM, I record when the SA was shared and when the DD arrived. | DD due at +15 working days from SA shared; overdue escalates to the team lead. | P1 |
| US-09 | As an RM, I record SD draft and registration. | SD draft due at +2 days; registration due 1 day after DD received; registration closes the lead. | P0 |
| US-10 | As an RM, I mark interior pitched and referral asked on every lead. | Both default to "not yet"; dashboard shows coverage % per RM. | P1 |

### M5 Mail & calls

Mails are sent and answered in NoBroker mail as today. The CRM links each thread to its lead and tracks it.

| ID | Story | Acceptance criteria | Priority |
| --- | --- | --- | --- |
| US-11 | As an RM, I link a NoBroker mail thread to a lead (paste the thread link or ID), so its revert is tracked. | Thread link opens the mail in NoBroker mail; received time and owner stored; revert due time set by rule. | P0 |
| US-12 | As an RM, I mark a linked thread replied after answering it in NoBroker mail. | Reply time and replier recorded; thread leaves the pending queue. | P0 |
| US-13 | As a team lead, I see every linked mail awaiting a revert, by RM, oldest first. | Queue updates live; overdue reverts in red; count per RM. | P0 |
| US-13a | As a team lead, I see who replied to each mail and when. | History kept after the thread closes. | P1 |
| US-13b | As the system, I capture sent and received mail events from NoBroker mail automatically, so RMs don't mark them by hand. | Only if NoBroker grants read access to mail metadata (sender, time, thread ID — Not content); until then US-11/12 are manual. | P2 |

### M6 Refunds

| ID | Story | Acceptance criteria | Priority |
| --- | --- | --- | --- |
| US-14 | As an RM, I mark a property cancelled and fill the refund form. | Refund record opens with reason, type, BM, holding and refund amounts; lead leaves the servicing queue. | P0 |
| US-15 | As the refund desk, I'm reminded to call every 2 days. | Call clock repeats every 2 days until a decision; missed call shows overdue. | P0 |
| US-16 | As a team lead, I approve or deny a refund. | Approve starts a 7-day initiation clock; deny requires the denial mail to be logged and starts token recovery / penalty tracking. | P0 |
| US-17 | As the refund desk, I track a refund to credit. | States: raised → approved → initiated → credited, or denied → recovery → settled; each change logged. | P1 |

### M7, M9, M10 Tickets, reports, audit

| ID | Story | Acceptance criteria | Priority |
| --- | --- | --- | --- |
| US-18 | As an RM, I attach a ticket ID to a lead and see its status. | Ticket ID searchable; status visible on the lead. | P1 |
| US-19 | As a team lead, I see a live dashboard: open, overdue, due, blocked, by segment and RM. | Numbers match a direct database count; refresh without reload. | P0 |
| US-20 | As a manager, I see an RM scorecard: SLA hit rate, revert time, interior and referral coverage. | Credit goes to whoever owned the lead when the stage was done. | P1 |
| US-21 | As anyone, I open a lead's timeline to see every change, by whom and when. | Every write appears; nothing can be edited or deleted from the log. | P0 |

Manpower stories (US-22 to US-28) are in section 6.

## 5. SLA / TAT rules

Every clock starts on a recorded event and its deadline is fixed when it starts. WD = working days (Monday–Friday, minus NoBroker holidays from an admin-maintained calendar).

| Clock | Starts when | Due | Due-soon warning | On breach |
| --- | --- | --- | --- | --- |
| Onboarding | Lead created | Promise TAT | 1 day before | Overdue; team lead alerted |
| Docs collection | OB done | 5 WD (to confirm) | 1 day before | Overdue |
| DDP – PR report | Docs collected | 3 WD | 1 day before | Overdue; advocate + RM alerted |
| DDP – final report | Docs collected | 7 WD | 1 day before | Blocked if a dependency is recorded, else overdue |
| SA draft | SA details shared | 2 days | same day | Overdue |
| SA signing | SA details shared | 5 days | 1 day before | Overdue |
| Loan DD | SA shared to loan team | 15 WD | 3 days before | Escalate to team lead + loan lead |
| SD draft | DD received | 2 days | same day | Overdue |
| Registration | DD received | 1 day | same day | Overdue |
| Mail revert | Inbound mail logged | To confirm (e.g. 24 h) | 4 h before | In RM-wise pending queue, red |
| Refund call | Refund raised; repeats | Every 2 days | same day | Overdue call |
| Refund initiation | Refund approved | 7 days | 2 days before | Escalate to team lead |

**Status rules**

- **On track** — before the warning window.
- **Due soon** — inside the warning window.
- **Overdue** — past due, no dependency recorded.
- **Blocked** — past due with a dependency recorded (e.g. "khata pending", "sanction + DD pending"); counted separately so RMs aren't blamed for external waits.
- **Done** — the stage's completion event exists.

Clocks do not pause for an RM's leave; the lead moves to the cover queue instead (section 6). Changing a past date re-computes the clock and is logged.

## 5a. Project view: where each lead is stuck and how work flows

Each lead is treated as a small project and its stages as linked activities, the same model Primavera uses. That shows planned vs actual for one lead, and where work piles up across all leads. It is built from the same stage dates and events as the SLA engine, so no separate tool or licence is needed.

&#91;embedded content: lead GP0001 · planned vs actual, from the Society sheet&#93;

This is a real lead from the Society sheet. Planned dates come from the TAT rules; the chart shows the delay started at DDP, grew at the sale agreement, and the deal now waits on the bank.

**What the project view shows**

1. **Lead Gantt** — planned (baseline) vs actual bar for every stage, with a today line, as above.
2. **Dependencies and forecast** — each stage waits on the one before (DDP final → SA → loan DD → SD → registration). When one slips, the forecast dates of every later stage move, and the forecast registration date is compared with the promise TAT.
3. **Critical path** — the chain of stages that decides the registration date, and how many days of slack each stage has left.
4. **Flow board** — a column per stage with the leads sitting in it now; per column: count, entered and left this week, average days in stage.
5. **Bottleneck heatmap** — stage × segment, RM, advocate or bank, coloured by median days stuck and count blocked.
6. **Delay attribution** — every late day tagged to a cause (RM, advocate, seller documents, bank/loan, khata, customer), giving a "where the time goes" report.
7. **Lead timeline** — every event on the lead in order, with who and when.

| ID | Story | Acceptance criteria | Priority |
| --- | --- | --- | --- |
| US-29 | As an RM or team lead, I open a lead's Gantt to see planned vs actual for each stage. | Baseline fixed when each clock starts; actual bars from stage dates; today line; late stages in red. | P0 |
| US-30 | As a team lead, I see the forecast registration date for each lead. | Recomputed when any stage date changes; flagged when later than the promise TAT. | P1 |
| US-31 | As a manager, I see a flow board of how many leads sit in each stage and for how long. | Counts match the leads table; click a column to list its leads. | P0 |
| US-32 | As a manager, I see where leads get stuck by segment, RM, advocate and bank. | Heatmap of median days and blocked count; click a cell to list its leads. | P1 |
| US-33 | As a manager, I see total delay days by cause per month. | Each late stage has one cause from a fixed list; untagged delays shown as "unknown". | P1 |
| US-34 | As a team lead, I see each lead's critical path and remaining slack. | Stages with zero slack highlighted. | P2 |
| US-35 | As anyone, I see a lead's full event timeline. | Same data as the audit log; read-only. | P0 |

To make delay attribution work, the free-text Hurdle / Dependency columns in today's sheets become a fixed list of causes, with a note field beside it.

## 6. Manpower: joiners, leave and exits

The rule: **a lead belongs to a role and a person, and the person can change without losing the lead's history.** Agents are never deleted, only deactivated, so past work and credit stay correct.

**Agent record:** name, NoBroker login, team, role, status (active / on leave / exited), backup agent, capacity (max open leads), join date, exit date.

| ID | Story | Acceptance criteria | Priority |
| --- | --- | --- | --- |
| US-22 | As an ops admin, I add a new joiner, so they can get leads. | Account linked to NoBroker login; starts with zero leads; shows in assignment lists. | P0 |
| US-23 | As a team lead, I mark an RM on leave with dates and a backup. | During the leave, their open leads show in the backup's queue and in a team "Needs cover" queue; on return they flip back automatically. | P0 |
| US-24 | As an RM, I mark myself on unplanned leave today. | Takes effect at once; team lead notified. | P1 |
| US-25 | As a team lead, I move an exiting RM's whole book in one action. | Only open leads move; closed and refund leads keep the original owner; every move logged; preview shows the count before confirming. | P0 |
| US-26 | As a team lead, I split a book across several RMs. | Choose targets; CRM spreads by current load; result shown before confirming. | P1 |
| US-27 | As a team lead, I see each RM's load and overdue count, so I rebalance before TATs slip. | Live table: open, overdue, blocked, capacity used %. | P0 |
| US-28 | As the system, I assign new leads to the least-loaded active RM in the team. | Skips RMs on leave or at capacity; manual override allowed and logged. | P2 |

**Rules**

- No open lead may have an inactive owner for more than 1 working day; such leads always appear in Needs cover.
- Credit for a finished stage goes to whoever owned the lead at that moment, not the current owner.
- When an RM exits, their login loses access the same day; their records stay.
- Duplicate people (e.g. "Varsha" and "Varsha M" in today's sheet) are merged once during migration, by an admin.

## 7. Data rules

**The CRM database is the source of truth. The sheet is a mirror.** Data flows one way after cutover: CRM → sheet. Nobody edits the mirror.

**No data loss — how it is guaranteed**

1. A save is confirmed to the user only after the database has written it. If it fails, the form stays open with the data and an error.
2. Nothing is overwritten without a trace: every change is an event (who, when, field, old value, new value). Deletes are soft — a deleted lead is hidden, not erased.
3. Daily automatic backups with 7-day point-in-time recovery; a monthly restore test.
4. The sheet mirror is refreshed from the CRM every few minutes, so there is always a second, human-readable copy.

**Migration and parallel run** (we don't touch the production sheet until cutover)

1. **Snapshot import.** Take a copy of the two workbooks; import the seven working tabs into one leads table with a segment column. Reject bad rows with a reason report.
2. **Pilot on the snapshot.** The team tests the CRM on that copy. Production sheet unchanged.
3. **Delta sync.** Before go-live, re-import from the live sheet; rows changed since the snapshot update the CRM by lead code, with a list of conflicts to review.
4. **Freeze and cut over.** Sheet goes read-only for a few hours, a final delta runs, then all writes move to the CRM and the sheet becomes the mirror.

**Field rules**

- **Lead code** = a segment prefix plus a running number: GP (GP || Society), BAPS (Society), SSPP (Post paid), Plot (Plot), BMBA (BM), BMHV (BM >1L). Existing codes are kept exactly as they are. New leads get the next free number automatically; nobody types a code. A code belongs to one deal only and never changes.
- **Before import:** the snapshot has 30 codes used on two different rows (Society 2, Post paid 4, Plot 3, BM 16, BM >1L 5), one Code cell holding text instead of a code, and BM numbering that changes from BMBA12xxx to BMBA1xxx. Each duplicate is reviewed by a person: same deal → merge; two deals → the later one gets a new code, with the old one kept as a note.
- Dates stored as dates, not text; money as whole rupees (numbers); property value kept as entered plus a parsed number in rupees.
- People (RMs, advocates) stored once each, referenced by ID; "Varsha" / "Varsha M"-style duplicates merged once by an admin.
- "Waiting on" is a fixed list (seller, buyer, buyer & seller, advocate/legal, khata, bank/loan, builder, sales team, internal) plus a free-text note.

## 8. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Durability | No confirmed write is ever lost; daily backups, 7-day point-in-time recovery |
| Real-time | A change by one user shows for others within 5 s; SLA status recomputed at least every 5 min |
| Access | Sign-in only with a NoBroker Google account; no personal or outside accounts; role-based permissions (section 2) |
| Data residency | Data stored in an India region; no export of customer data to outside tools |
| Privacy | Customer phone and email visible only to roles that need them; masked in exports for others |
| Audit | Every create, edit, reassign and status change logged; log is append-only |
| Performance | Lists of 5,000 leads load in under 2 s; search returns in under 1 s |
| Availability | Working hours (9 am–9 pm IST) uptime 99.5% |
| Scale | 20,000 leads and 50 users without redesign |
| Usability | An RM can finish the day's queue without opening a spreadsheet; works on a laptop browser |

## 8a. Design & UI

The screens are our own design, built on patterns that work across good sales CRMs: a stage bar on every record, saved queue views, an activity timeline and a pipeline board. All six are in [Servicing CRM — Screen Designs](https://claude.ai/artifact/KZhfciZcSSo23tY11joMLi), clickable from the left menu, with figures from the 25 Nov sheet snapshot.

| Screen | Who uses it | What it does | Stories |
| --- | --- | --- | --- |
| [1 · RM worklist](https://claude.ai/artifact/KZhfciZcSSo23tY11joMLi#artboard-Main) | RM | Queue counts (overdue, blocked, due soon, mail reverts) and the day's leads, each with a progress bar and what it is waiting on | US-04–09, US-12 |
| [2 · Lead record](https://claude.ai/artifact/KZhfciZcSSo23tY11joMLi#artboard-Lead) | RM, team lead | Stage bar with dates and lateness; deal terms; planned vs actual; activity timeline; linked mail and ticket | US-01, US-05, US-10, US-11, US-18, US-21, US-29, US-35 |
| [3 · Team dashboard](https://claude.ai/artifact/KZhfciZcSSo23tY11joMLi#artboard-Dashboard) | Team lead, manager | Totals, RM workload, what leads wait on, stage × segment heatmap, clean-up warning | US-19, US-27, US-32 |
| [4 · Flow board](https://claude.ai/artifact/KZhfciZcSSo23tY11joMLi#artboard-Flow) | Manager | A column per stage with count, average days and status split | US-31 |
| [5 · Manpower & cover](https://claude.ai/artifact/KZhfciZcSSo23tY11joMLi#artboard-Manpower) | Team lead, ops admin | Team load, leave with backup, needs-cover queue, exit and reassign, duplicate people | US-22–27 |
| [6 · Refund desk](https://claude.ai/artifact/KZhfciZcSSo23tY11joMLi#artboard-Refunds) | Refund desk, team lead | Refund steps with counts, latest requests, money in pipeline, reasons | US-14–17 |

**Design rules**

- **Status is a word plus a colour**, never colour alone: On track (green), Due soon (amber), Overdue (red), Blocked (purple), Closed (grey). The same five everywhere.
- **Overdue and Blocked are separate.** Blocked always shows what it is waiting on, so RMs are not blamed for outside delays.
- **One accent colour (indigo)** for actions and links; everything else is neutral, so status colours stand out.
- **Inter font**, 14 px body, 24 px page titles; text contrast at least 4.5:1.
- **Laptop first, works on a phone**: the menu stacks and wide tables scroll sideways.
- **Customer phone and email are hidden** unless the role needs them (section 8).
- **Empty states say why**: e.g. "starts when threads are linked" rather than a fake zero.

The snapshot surfaced two data issues the screens make visible: 149 open leads are more than 120 days into one stage, and 34 of 39 refund requests have no status. Both go into the migration clean-up (section 7).

## 9. Architecture & cost on Google Cloud

A Salesforce-style CRM for this team can run on Google Cloud for roughly $10–20 a month, because the load is small (about 20 users, 5,000–20,000 leads). We build the ten modules above, not a copy of Salesforce: copying a commercial product's design is unnecessary and carries legal risk.

**Components**

| Part | Google Cloud service | Job |
| --- | --- | --- |
| Web app + API | Cloud Run (Mumbai, asia-south1) | Screens and every write; scales to zero when idle |
| Database | Cloud SQL for PostgreSQL | Leads, tasks, mails, refunds, agents, event log |
| SLA engine | Cloud Run job triggered by Cloud Scheduler every 5 min | Recompute clocks, raise alerts |
| Sheet mirror | Same scheduled job, via the Google Sheets API | Write CRM data into a read-only mirror sheet |
| Sign-in | Google sign-in limited to the NoBroker Workspace domain (Identity-Aware Proxy) | No outside accounts can enter |
| Backups | Built-in database backups / point-in-time recovery | Restore after any mistake |

**Free tiers that make this cheap** (checked today):

- Cloud Run: 2 million requests a month free, plus a monthly allowance of free CPU and memory time, pooled across projects on one billing account ([Cloud Run pricing](https://cloud.google.com/run/pricing)).
- Firestore: 1 GiB stored, 50,000 reads and 20,000 writes a day free; beyond that, reads cost about $0.03 per 100,000 ([Firestore pricing](https://cloud.google.com/firestore/pricing)).
- Cloud SQL: the cheapest shared-core instance (db-f1-micro) is about $8/month in us-central1 ([Bytebase price table](https://www.bytebase.com/dbcost/cloudsql-pricing/)), but shared-core instances are not covered by the Cloud SQL SLA ([Cloud SQL pricing](https://cloud.google.com/sql/docs/postgres/pricing)).

**Estimated monthly cost** (approximate; confirm Mumbai prices in the Google Cloud pricing calculator)

| Stage | Setup | Approx. cost / month |
| --- | --- | --- |
| Pilot (5–10 users) | Cloud Run (free tier) + Cloud SQL Postgres shared-core | $10–15 |
| Go-live, option A | Cloud Run + Firestore (≈500k reads/day) | $5–15 |
| Go-live, option B | Cloud Run + Cloud SQL Postgres shared-core | $10–20 |
| Go-live, option B with SLA | Cloud Run + Cloud SQL Postgres db-standard-1 | \~$50–60 |

**Decision:** build on **Cloud SQL for PostgreSQL from day one** (shared-core for the pilot, about $8–10 a month; db-standard-1 at go-live if we want the SLA-backed tier). The dashboards, heatmap, delay attribution and reconciliation reports are joins and group-bys, which Postgres does well and Firestore does badly; choosing now avoids a migration later. Use NoBroker's company Google Cloud organisation and billing — not a personal account — so data ownership and access stay with NoBroker.

The current prototype runs on Claude's artifact database with masked data, for demo only; it is not the production platform.

## 10. Rollout

We never touch the production sheet until the CRM has passed a pilot. Each phase has a gate; we don't move on until it's met.

| Phase | What happens | Duration (estimate) | Gate to move on |
| --- | --- | --- | --- |
| 0. PRD sign-off | Agree this document; answer open questions (section 11) | 1 week | Team lead + manager approve scope and SLA table |
| 1. Prototype demo | Clickable CRM on masked sample data (160 leads) for the pitch | Done / 1 week to polish | Stakeholders agree the flow fits |
| 2. Build v1 on Google Cloud | Modules M1–M3, M8, M10 first, then the rest | 4–6 weeks | All P0 stories pass their acceptance tests |
| 3. Pilot (parallel run) | 3–5 RMs use the CRM on a fresh snapshot; sheet continues as normal | 2 weeks | Zero lost records; CRM statuses match a manual check on 50 leads; RMs prefer it |
| 4. Delta sync + cutover | Re-import latest sheet data, review conflicts, freeze sheet, switch writes to CRM | 1–2 days | Final counts match between sheet and CRM |
| 5. Live, sheet as mirror | Everyone in the CRM; mirror sheet refreshes from CRM | Ongoing | One full month with no data issues = v1 done |

**Test plan per phase:** every P0 story's acceptance criteria run as a checklist; a data-reconciliation report (lead counts, stage counts, amounts by segment) compares sheet and CRM before cutover; a restore-from-backup drill before go-live.

## 11. Success metrics, risks and open questions

**Success metrics** (baseline measured in the pilot's first week)

| Metric | Target after 1 month live |
| --- | --- |
| Records lost or overwritten without trace | 0 |
| Leads past TAT with no owner action that day | Down 50% |
| DDP final reports within 7 WD | 85%+ |
| Mail reverts within SLA | 90%+ |
| Open leads with an inactive owner > 1 WD | 0 |
| Time a team lead spends building reports | Near zero (dashboards) |
| Interior + referral pitched on every lead | 95%+ |

**Risks**

| Risk | Mitigation |
| --- | --- |
| RMs keep updating the sheet out of habit | Sheet becomes read-only at cutover; CRM is faster for daily work |
| Messy legacy data (junk rows, duplicate RMs, text dates) | Import rejects with reasons; admin cleans once before cutover |
| Google Cloud project owned by a person, not NoBroker | Use the company GCP organisation and billing from day one |
| Customer data exposure | Domain-only sign-in, role-based fields, no customer data in demos (masked) |
| One builder, no backup | Code in a NoBroker Git repo; short runbook; second person trained |

**Open questions (need answers before build)**

- [ ] Is the Google Cloud billing account under NoBroker's company organisation?
- [ ] Docs-collection TAT after OB: is 5 WD right?
- [ ] Mail revert SLA: 24 hours, or per customer type?
- [ ] Promise TAT: one value per package, or set per lead?
- [ ] SA clocks: does "2 days / 5 days" mean calendar or working days?
- [ ] Which holiday calendar applies (Bangalore only, or per city)?
- [ ] Can the CRM read the NoBroker mail and ticketing systems by API, and who owns that access?
- [ ] Who approves refunds and penalty waivers?
- [ ] Are "Varsha" and "Varsha M" one person or two?

## 12. Engineering Handoff — Build Guide for Claude Code

This section is addressed to the AI coding agent (Claude Code). Read it completely before writing a single line.

### 12.1 Core Rules (never break these)

1. **Never hard-delete.** Every row gets `deleted_at` / `is_active`. Soft-delete only.
2. **Every write emits an event.** Insert into `events` (lead\_id, actor\_id, event\_type, payload JSON) on every create / update / status-change.
3. **IST everywhere.** Store UTC in Postgres; display `Asia/Kolkata` in all UI and logs.
4. **Money in Rupees.** `NUMERIC(14,2)` columns; never floats for money.
5. **No customer PII in logs or demos.** Mask email, mask advocate name. Never log raw phone numbers.
6. **CRM tracks; NoBroker systems do the work.** The CRM records what happened and when.
7. **Sheets are a mirror, not the source.** CRM DB → Sheets via API. The sheet is read-only from the CRM's perspective.

### 12.2 Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS — indigo accent #3D4FD6, Inter font |
| ORM | Prisma |
| Database | Cloud SQL for PostgreSQL 15 (asia-south1) |
| Auth | Google OAuth via NextAuth.js + IAP (nobroker.in domain only) |
| Hosting | Cloud Run |
| SLA engine | Cloud Run Job every 5 min via Cloud Scheduler |
| Sheets mirror | Cloud Run Job every 10 min via Cloud Scheduler |
| Testing | Vitest (unit) + Playwright (e2e) |
| CI/CD | GitHub Actions → Cloud Build → Cloud Run |

### 12.3 Build Order

**M0 — Infra skeleton (Day 1-2):** Next.js + TypeScript + Tailwind; Prisma + Cloud SQL; NextAuth + IAP; /api/health; Cloud Run deploy.

**M1 — Lead CRUD (Day 3-5) ← US-01 to 05:** POST/GET/PATCH /api/leads; lead list + detail pages; event timeline.

**M2 — SLA engine (Day 6-8) ← US-06 to 10:** lib/sla.ts working-day calculator; jobs/sla-engine.ts every 5 min; status pills.

**M3 — Refund tracker (Day 9-10) ← US-14 to 16:** Refund CRUD; call-due queue; denial flow.

**M4 — Manpower (Day 11-12) ← US-22 to 28:** Agent CRUD (deactivate, never delete); leave calendar; bulk reassign.

**M5 — Sheets mirror (Day 13-14) ← US-17:** jobs/sheets-mirror.ts delta writer; Cloud Scheduler every 10 min.

**M6 — Dashboard & reports (Day 15-17) ← US-18 to 21:** KPI tiles; stage funnel; RM-wise pending mail reverts; Gantt-style project view.

**M7 — Polish, seed, UAT (Day 18-21):** Seed from leads\_seed.json; Playwright e2e; responsive audit; UAT handoff.

### 12.4 SLA Budgets

| Task | Clock starts | Working days |
| --- | --- | --- |
| OB discrepancy check | Token date +1 | 1 |
| DDP PR report | ver\_started\_date | 3 |
| DDP final report | PR report done | 7 |
| SA draft | DDP final done | 2 |
| SA signing | SA draft done | 5 |
| Loan DD | SA shared date | 15 |
| SD draft | Loan DD done | 2 |
| Registration | SD draft done | 1 |
| Refund call | Last call date | 2 |
| Refund initiation | Cancellation date | 7 |

dueAt is fixed when startedAt is set. It never changes.

### 12.5 Key Environment Variables

```
DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
ALLOWED_DOMAIN=nobroker.in, SHEETS_SPREADSHEET_ID_SOCIETY, SHEETS_SPREADSHEET_ID_BUYER,
GOOGLE_SERVICE_ACCOUNT_KEY, TZ=Asia/Kolkata
```

### 12.6 Open Questions Blocking Build

1. Indian public holidays list for SLA engine (FY 2024-25 and 2025-26).
2. "Due soon" threshold in working days (suggested: 1).
3. Mail integration scope — NoBroker Workspace Gmail service account?
4. Sheets spreadsheet IDs for Society and Buyer workbooks.
5. GCP project ID — confirm name and region (asia-south1).
6. Duplicate lead code resolution — 30 known duplicates; suffix strategy?
