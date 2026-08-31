/// Currencies whose minor unit is not 1/100 of the major unit. Everything not
/// listed here has two decimal places.
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF",
  "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
])
const THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"])

export const DEFAULT_CURRENCY = "INR"

export type CurrencyOption = {
  code: string
  name: string
  symbol: string
}

/// Ordered so the currencies an Indian user actually reaches for come first.
export const CURRENCIES: CurrencyOption[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "रू" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "QAR", name: "Qatari Riyal", symbol: "ر.ق" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
]

const BY_CODE = new Map(CURRENCIES.map((entry) => [entry.code, entry]))

export function currencyExponent(code: string): number {
  const upper = code.toUpperCase()
  if (ZERO_DECIMAL.has(upper)) return 0
  if (THREE_DECIMAL.has(upper)) return 3
  return 2
}

export function currencySymbol(code: string): string {
  return BY_CODE.get(code.toUpperCase())?.symbol ?? code.toUpperCase()
}

export function isSupportedCurrency(code: string): boolean {
  return BY_CODE.has(code.toUpperCase())
}
