import { describe, expect, it } from "vitest"

import { dueOccurrences, nextOccurrence } from "./recurrence"

const at = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe("nextOccurrence", () => {
  it("steps daily", () => {
    expect(
      nextOccurrence({ frequency: "DAILY", interval: 1 }, at("2026-03-01"))
    ).toEqual(at("2026-03-02"))
  })

  it("honours an interval greater than one", () => {
    expect(
      nextOccurrence({ frequency: "DAILY", interval: 3 }, at("2026-03-01"))
    ).toEqual(at("2026-03-04"))
  })

  it("clamps a month anchor to the length of the month", () => {
    // Rent on the 31st still has to come out in February.
    const next = nextOccurrence(
      { frequency: "MONTHLY", interval: 1, anchorDay: 31 },
      at("2026-01-31")
    )
    expect(next).toEqual(at("2026-02-28"))
  })

  it("lands on the requested weekday", () => {
    const next = nextOccurrence(
      { frequency: "WEEKLY", interval: 1, weekday: 1 },
      at("2026-03-04")
    )
    expect(next!.getUTCDay()).toBe(1)
    expect(next!.getTime()).toBeGreaterThan(at("2026-03-04").getTime())
  })

  it("stops at the end date", () => {
    expect(
      nextOccurrence(
        { frequency: "MONTHLY", interval: 1, endDate: at("2026-03-15") },
        at("2026-03-01")
      )
    ).toBeNull()
  })
})

describe("dueOccurrences", () => {
  it("catches up on every period a dormant template missed", () => {
    const occurrences = dueOccurrences(
      { frequency: "MONTHLY", interval: 1, anchorDay: 1 },
      null,
      at("2026-01-01"),
      at("2026-04-10")
    )
    expect(occurrences).toEqual([
      at("2026-01-01"),
      at("2026-02-01"),
      at("2026-03-01"),
      at("2026-04-01"),
    ])
  })

  it("returns nothing when already up to date", () => {
    expect(
      dueOccurrences(
        { frequency: "MONTHLY", interval: 1, anchorDay: 1 },
        at("2026-04-01"),
        at("2026-01-01"),
        at("2026-04-10")
      )
    ).toEqual([])
  })

  it("caps a very stale template rather than generating forever", () => {
    expect(
      dueOccurrences(
        { frequency: "DAILY", interval: 1 },
        null,
        at("2020-01-01"),
        at("2026-01-01"),
        24
      )
    ).toHaveLength(24)
  })
})
