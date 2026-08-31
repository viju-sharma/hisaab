# Hisaab

**हिसाब** — *account, reckoning.* A shared-expenses app: split bills with
friends, flatmates and family, track who paid and who owes, and settle up. INR
first, installable as a PWA, with a full audit trail.

## Getting started

```bash
pnpm install
cp .env.example .env          # fill in DATABASE_URL and the Clerk keys
pnpm prisma migrate deploy    # or `pnpm db:migrate` in development
pnpm db:seed                  # 17 shared expense categories
pnpm dev
```

`prisma7.config.ts` is the default config filename in Prisma 7 and is
auto-detected — no `--config` flag is needed.

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
store (`lib/observability/`). Every log line, every Prisma query span and every
audit row carries it, so a single `grep` reconstructs the whole event flow.
Audit rows are written inside the mutating transaction — never from the Prisma
extension, which cannot see the before-state and would recurse.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm test` | Unit tests for money, splits, balances and recurrence |
| `pnpm typecheck` / `pnpm lint` | Types and lint |
| `pnpm db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma |

## Scheduled work

`vercel.json` registers two cron routes, both gated on `CRON_SECRET`:

- `/api/cron/recurring` (daily) materialises due recurring expenses. Each
  occurrence is claimed by a `RecurringRun` row whose unique key makes the run
  idempotent — a retry collides instead of double-charging.
- `/api/cron/reminders` (weekly) nudges anyone with an outstanding balance, at
  most once a week per group.
