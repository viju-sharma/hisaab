import { describe, expect, it } from "vitest"

import { convertMinor, formatMoney, parseAmountToMinor } from "./money"

describe("parseAmountToMinor", () => {
  it("parses rupees into paise without float drift", () => {
    expect(parseAmountToMinor("19.99")).toBe(1999)
    expect(parseAmountToMinor("0.1")).toBe(10)
    expect(parseAmountToMinor("1,20,000")).toBe(12_000_000)
    expect(parseAmountToMinor("₹450")).toBe(45_000)
  })

  it("respects currencies that are not two-decimal", () => {
    expect(parseAmountToMinor("1200", "JPY")).toBe(1200)
    expect(parseAmountToMinor("1.234", "KWD")).toBe(1234)
  })

  it("truncates beyond the currency's precision rather than rounding up", () => {
    expect(parseAmountToMinor("10.999")).toBe(1099)
  })

  it("rejects nonsense", () => {
    expect(parseAmountToMinor("abc")).toBeNull()
    expect(parseAmountToMinor("")).toBeNull()
    expect(parseAmountToMinor("1.2.3")).toBeNull()
  })
})

describe("formatMoney", () => {
  it("uses Indian digit grouping", () => {
    expect(formatMoney(12_000_000)).toContain("1,20,000")
  })

  it("drops the decimals on whole amounts", () => {
    expect(formatMoney(45_000)).toBe("₹450")
    expect(formatMoney(45_050)).toBe("₹450.50")
  })

  it("renders negatives with a leading sign", () => {
    expect(formatMoney(-45_000).startsWith("-")).toBe(true)
  })
})

describe("convertMinor", () => {
  it("is a no-op within one currency", () => {
    expect(convertMinor(1234, "INR", "INR", 90)).toBe(1234)
  })

  it("crosses currencies at the given rate", () => {
    // $12.00 at ₹83.5 to the dollar.
    expect(convertMinor(1200, "USD", "INR", 83.5)).toBe(100_200)
  })

  it("handles a zero-decimal source currency", () => {
    // ¥1000 at ₹0.55 to the yen.
    expect(convertMinor(1000, "JPY", "INR", 0.55)).toBe(55_000)
  })
})
