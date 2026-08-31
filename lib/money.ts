import { DEFAULT_CURRENCY, currencyExponent } from "@/lib/currency"

/// Money never exists as a float in this app. Every amount is an integer count
/// of a currency's minor unit (paise for INR, yen for JPY) so addition,
/// division and comparison are exact by construction.
export type Minor = number

export function parseAmountToMinor(
  input: string | number,
  currency: string = DEFAULT_CURRENCY
): Minor | null {
  const text = String(input).trim().replace(/[,\s₹]/g, "")
  if (!text) return null
  if (!/^-?\d*(\.\d*)?$/.test(text)) return null

  const exponent = currencyExponent(currency)
  const negative = text.startsWith("-")
  const [whole = "0", fraction = ""] = text.replace("-", "").split(".")

  // String maths rather than `* 100`, which turns 19.99 into 1998.9999999999998.
  const padded = (fraction + "0".repeat(exponent)).slice(0, exponent)
  const minor = Number(whole || "0") * 10 ** exponent + Number(padded || "0")
  if (!Number.isFinite(minor)) return null

  return negative ? -minor : minor
}

export function minorToMajor(
  minor: Minor,
  currency: string = DEFAULT_CURRENCY
): number {
  return minor / 10 ** currencyExponent(currency)
}

/// The single place currency is turned into text. `en-IN` gives the lakh/crore
/// digit grouping an Indian user expects — ₹1,20,000, not ₹120,000.
export function formatMoney(
  minor: Minor,
  currency: string = DEFAULT_CURRENCY,
  options: { locale?: string; compact?: boolean; signed?: boolean } = {}
): string {
  const { locale = "en-IN", compact = false, signed = false } = options
  const exponent = currencyExponent(currency)
  const value = minorToMajor(minor, currency)

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    // Whole amounts read better without ".00" in dense lists.
    minimumFractionDigits: minor % 10 ** exponent === 0 ? 0 : exponent,
    maximumFractionDigits: exponent,
    notation: compact && Math.abs(value) >= 100000 ? "compact" : "standard",
  }).format(Math.abs(value))

  if (minor < 0) return `-${formatted}`
  if (signed && minor > 0) return `+${formatted}`
  return formatted
}

export function sumMinor(values: Iterable<Minor>): Minor {
  let total = 0
  for (const value of values) total += value
  return total
}

/// Converts an amount into a group's currency at a snapshotted rate. Rounds
/// half-up on the absolute value so positive and negative amounts round
/// symmetrically and a converted total never drifts by direction.
export function convertMinor(
  minor: Minor,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): Minor {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return minor
  const major = minorToMajor(minor, fromCurrency) * rate
  const scaled = major * 10 ** currencyExponent(toCurrency)
  return Math.sign(scaled) * Math.round(Math.abs(scaled))
}
