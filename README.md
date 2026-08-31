# Hisaab

**हिसाब** — *account, reckoning.* A shared-expenses app: split bills with
friends, flatmates and family, track who paid and who owes, and settle up. INR
first, installable as a PWA, with a full audit trail.

## Getting started

```bash
nvm use                       # Node 22.18+, required by @prisma/orm-postgres
pnpm install
cp .env.example .env          # fill in DATABASE_URL and the Clerk keys
pnpm db:emit                  # contract.json + contract.d.ts from the contract
pnpm db:migrate               # apply any pending migrations
pnpm db:seed                  # 17 shared expense categories
pnpm dev
```

The data layer is **Prisma 8**. `prisma8/contract.prisma` is the source of
truth; `prisma contract emit` derives `generated/prisma8/contract.json` and
`contract.d.ts` from it, and the migration planner diffs the contract to work
out the DDL. Both generated files are artefacts — edit the contract, never them.

Two things Prisma 8 does not give you that Prisma 7 did, both handled at the
data boundary rather than sprinkled through the app:

- **No `Date` codec.** `timestamp(3)` columns are carried as Postgres' own text
  form; `lib/db-time.ts` is the only place that crosses to `Date`, so date-fns,
  zod and the recurrence engine keep working in `Date`. It also supplies
  `updatedAt` on every write, which `@updatedAt` used to do.
- **No `cuid()` default.** `lib/id.ts` mints cuid v1 ids in the same shape
  Prisma 7 produced, so new rows are indistinguishable from the existing ones.

## How it fits together

**Money is never a float.** Every amount is an integer count of a currency's
minor unit (paise for INR, yen for JPY) — see `lib/money.ts`, which also owns
the only `Intl.NumberFormat` call in the app so ₹1,20,000 renders in lakhs.
Splits use largest-remainder allocation (`lib/split.ts`), so `sum(splits)`
always equals the total no matter how awkward the division.

**Expenses store two columns of amounts** — one in the expense's own currency
and one in the group's — allocated by the same weights from the converted
total. Each sums exactly to its own total, and the rate is snapshotted at
creation so historic balances never drift when the market moves.

**Every mutation goes through one door.** `defineAction` in `lib/action.ts`
enters the trace context, resolves the actor, validates with zod, opens a span
and normalises errors. Group access is re-checked in `lib/authz.ts` on every
read and write — `proxy.ts` only does the optimistic redirect, because the Next
docs are explicit that proxy is not an authorisation mechanism.

**One gesture produces one trace.** `proxy.ts` mints a trace ID and stamps it on
the request headers; server entry points read it back into an AsyncLocalStorage
store (`lib/observability/`). Every log line, every database query span and
every audit row carries it, so a single `grep` reconstructs the whole event
flow. Query spans come from a runtime middleware
(`lib/observability/db-tracing.ts`) registered on the client. Audit rows are
written inside the mutating transaction — never from the middleware, which
cannot see the before-state.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm test` | Unit tests for money, splits, balances and recurrence |
| `pnpm typecheck` / `pnpm lint` | Types and lint |
| `pnpm db:emit` | Re-derive the contract artefacts after editing `prisma8/contract.prisma` |
| `pnpm db:plan --name <slug>` | Plan a migration from the contract diff |
| `pnpm db:migrate` | Apply pending migrations and advance the `db` ref |
| `pnpm db:verify` / `pnpm db:seed` | Check the live schema against the contract; seed categories |

## Scheduled work

`vercel.json` registers two cron routes, both gated on `CRON_SECRET`:

- `/api/cron/recurring` (daily) materialises due recurring expenses. Each
  occurrence is claimed by a `RecurringRun` row whose unique key makes the run
  idempotent — a retry collides instead of double-charging.
- `/api/cron/reminders` (weekly) nudges anyone with an outstanding balance, at
  most once a week per group.
