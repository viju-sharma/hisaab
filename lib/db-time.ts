/// Prisma 8 has no `Date` codec. The contract stores every `timestamp(3)`
/// column through the string codec, so rows carry Postgres' own text form —
/// `2026-08-31 09:15:09.845`, no zone — and this module is the only place that
/// crosses back to `Date`. Everything above the data layer (date-fns, zod,
/// lib/recurrence.ts, the crons, the components) keeps working in `Date`.
///
/// The stored values are UTC: Prisma 7 wrote UTC into these columns and the
/// column type carries no zone, so the conversion appends `Z` rather than
/// letting the runtime guess a local zone.

import type { TimestampString } from "@prisma/orm-postgres/target/codec-types"

/// A `timestamp(3)` value as Postgres renders it. The brand is the contract's
/// own, so a bare string can never be passed where a column is expected.
export type Timestamp = TimestampString<3>

export function toDate(value: Timestamp): Date {
  return new Date(`${value.replace(" ", "T")}Z`)
}

export function toDateOrNull(value: Timestamp | null): Date | null {
  return value === null ? null : toDate(value)
}

export function fromDate(value: Date): Timestamp {
  return value.toISOString().replace("T", " ").replace("Z", "") as Timestamp
}

export function fromDateOrNull(
  value: Date | null | undefined
): Timestamp | null {
  return value == null ? null : fromDate(value)
}

/// `new Date()` rendered for the database — the value `@updatedAt` used to
/// supply. Prisma 8 has no update-time default that matches a `timestamp(3)`
/// column, so every write sets `updatedAt` explicitly through this.
export function now(): Timestamp {
  return fromDate(new Date())
}
