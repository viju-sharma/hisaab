import type { Numeric } from "@prisma/orm-postgres/target/codec-types"

/// Prisma 8 carries `numeric` columns as exact decimal strings rather than a
/// Decimal class, so the exchange rate crosses the data boundary here the same
/// way timestamps cross it in lib/db-time.ts. Rates are the only numeric column
/// in the schema; every money figure is an integer count of minor units.
export type ExchangeRate = Numeric<18, 8>

export function toExchangeRate(value: number): ExchangeRate {
  return value.toFixed(8) as ExchangeRate
}

export function fromExchangeRate(value: ExchangeRate): number {
  return Number(value)
}
