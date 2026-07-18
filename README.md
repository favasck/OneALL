# OneAll — monorepo scaffold

Generated from `OneAll_Master_Project_Plan_v1.1.docx`, Stage 1 (Weeks 3-7), as a Gate C/D input.
This is a **scaffold**, not a finished product: it establishes the architecture, data model and
module boundaries the plan already committed to, with a substantial and growing set of real,
working modules and clear `TODO` markers everywhere real work remains. Gate D (team + budget
approved) is still a human decision — see `OneAll_MVP_Budget_Estimator.xlsx`.

## Layout

```
apps/
  api/         NestJS backend (Section 8, "API-first design") — 12 modules:
                 auth, tenants, customers, suppliers, products, invoices,
                 purchase-bills, receipts, supplier-payments, inventory,
                 accounting, reports
  web/         React + Vite Business Web app — 15 pages: Login, Dashboard,
                 Customers, Suppliers, Products, Invoices, New invoice,
                 New purchase bill, Record receipt, Record supplier payment,
                 Stock, Inventory, Accounting, Reports, Settings
  mobile/      Expo/React Native app — Pulse, Customers, Alerts screens (Appendix A)
  connector/   Tally connector service skeleton (Section 7 — read-only, incremental, idempotent)
packages/
  db/          Prisma schema modeling Section 8.2's core entities, + a seed script
  shared/      Cross-app TypeScript types + the Appendix C posting-rule engine
```

Every MVP functional area from Section 4 of the plan (company/config, customers/receivables,
suppliers/payables, products, sales/billing, purchases/expenses, inventory, accounting/reports)
now has a real, compiling backend module and a matching web page — including a minimal Settings
page for company/config (Section 4.1), though it only covers what `tenants.service.ts` actually
supports today (list/create companies), not CR/tax details, branches, warehouses or numbering.
What's still missing: anything not explicitly listed above (e.g. expense entry, warehouse
transfer, void/credit-note flows, the Section 5.8 invitation-by-email flow) — see the `TODO`
comments in each service file.

## Authentication (Section 9.1 / 5.8)

Real, not stubbed: `apps/api/src/auth` hashes passwords with bcryptjs (12 rounds), issues opaque
session tokens (SHA-256 hash stored, raw token returned once), and `SessionAuthGuard` +
`PermissionGuard` run as global guards in that order (`app.module.ts`) — every route is
deny-by-default unless it's `@Public()` or declares `@RequirePermission(module, action)`.
`POST /auth/login` and `POST /auth/logout` are wired end to end. Not built: the invitation-by-
email flow itself (Section 5.8 steps 1-2 — admin selects role/scope and sends an invite; that
needs an email service, out of scope here). `packages/db/prisma/seed.ts` creates a real Owner
user (`owner@alwaha-trading.qa` / `ChangeMe123!`) with every permission, plus a starter chart of
accounts matching the `AccountRole` values the posting-rule engine emits — each account's `role`
field is what `apps/api/src/common/account-role-resolver.ts` looks up at posting time, so
journal entries resolve to real `Account.id` rows end to end, not a placeholder.

## What's real vs. stubbed

| Area | Status |
|---|---|
| `packages/db` Prisma schema | Written, manually reviewed for relation consistency. **Not run** — `prisma generate` needs `binaries.prisma.sh`, which this build environment's network blocks. Run `npm run db:generate` locally (needs a real Postgres for `migrate`). |
| `packages/db` seed script | **Compiles clean** (`tsc --noEmit`). Seeds "Al Waha Trading Co." (same company as the clickable prototype) with customers, products, stock, a starter chart of accounts, an Owner role with every permission, and a real login. **Not run end-to-end** — needs a live Postgres, not available here. |
| `docker-compose.yml` | Local Postgres only, for `npm run db:up`. YAML syntax checked; Docker itself isn't available in this sandbox to actually run it. |
| `packages/shared` posting rules | **Compiled and unit-tested** (`node --test`) — 4/4 tests pass, including the balanced-debit/credit invariant and the "no tax line when `taxAmount` is 0" behavior. Qatar has not implemented VAT as of July 2026; expected rate/timing is 5%, starting 2027 or 2028 (Fawaz/Guardian confirmation, Jul 2026 — still directional, not a formal advisor sign-off) — see the Decision Backlog Tracker. |
| `apps/api` NestJS | **Compiles clean** across all 12 modules (verified with `tsc -p` after every addition, not just once at the end). Auth is real (see above), not a stub. Every posting-rule-driven service (invoices, purchase-bills, receipts, supplier-payments) now resolves `JournalLine.accountId` to a real `Account.id` via `apps/api/src/common/account-role-resolver.ts`, which looks up the company's chart of accounts by `Account.role` (seeded in `packages/db/prisma/seed.ts`) and throws loudly if a role is missing rather than posting a bad reference. Not yet run end-to-end against a live database. |
| `apps/web` React | **Compiles and builds** (`vite build` succeeds, 51 modules). Dashboard is static placeholder data; Customers/Suppliers/Products/Invoices/Stock/Inventory/Accounting/Reports/Settings pages make real `fetch` calls to the API and will show a real error until `apps/api` is running against a live database — that's intentional, not a mock. New invoice, new purchase bill, record receipt, record supplier payment, the stock adjustment form and the Settings "add a company" form are working forms that POST to their real endpoints (receipt/payment forms validate that allocations sum to the total client-side before submitting, matching the API's own check). Login is wired for real: `src/auth/AuthContext.tsx` calls `POST /auth/login`, caches the returned session token, and `App.tsx` gates the whole app shell behind it — sign in with the seeded `owner@alwaha-trading.qa` / `ChangeMe123!` once a live API + database are running. |
| `apps/mobile` Expo | **Source syntax-verified, not full-type-verified.** `npm install` for the Expo/React Native dependency tree could not finish in this sandbox — repeated attempts (isolated from the rest of the monorepo, `--ignore-scripts`, warm npm cache) still exceeded this environment's per-command time limit purely on dependency resolution, before any package was even extracted. As a substitute, every file in `apps/mobile` was run through `esbuild` (TSX/TS parse + JSX transform, no type resolution needed) — all 5 files parse clean — and every import was manually cross-checked against what it imports (all resolve: relative imports mat