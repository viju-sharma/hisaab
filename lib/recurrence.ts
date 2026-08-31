import type { RecurrenceFreq } from "@/app/generated/prisma/enums"

export type RecurrenceRule = {
  frequency: RecurrenceFreq
  interval: number
  /// Day of month for MONTHLY/QUARTERLY/YEARLY, clamped to the month's length so
  /// "the 31st" still fires in February.
  anchorDay?: number | null
  /// 0-6, Sunday-first, for WEEKLY/FORTNIGHTLY.
  weekday?: number | null
  endDate?: Date | null
}

// Recurrence is calendar arithmetic, not instant arithmetic: "the 1st of every
// month" must mean the same day whether the server runs in Mumbai or Virginia.
// Everything here works on UTC calendar days, deliberately avoiding date-fns'
// local-time helpers.

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

function addUtcMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  const day = Math.min(
    date.getUTCDate(),
    daysInUtcMonth(year + Math.floor(month / 12), ((month % 12) + 12) % 12)
  )
  return new Date(Date.UTC(year, month, day))
}

export function nextOccurrence(rule: RecurrenceRule, after: Date): Date | null {
  const interval = Math.max(1, rule.interval)
  let candidate = startOfUtcDay(after)
  let guard = 0

  do {
    candidate = align(step(candidate, rule.frequency, interval), rule)
    guard += 1
  } while (candidate <= after && guard < 64)

  if (candidate <= after) return null
  if (rule.endDate && candidate > startOfUtcDay(rule.endDate)) return null
  return candidate
}

function step(date: Date, frequency: RecurrenceFreq, interval: number): Date {
  switch (frequency) {
    case "DAILY":
      return addUtcDays(date, interval)
    case "WEEKLY":
      return addUtcDays(date, 7 * interval)
    case "FORTNIGHTLY":
      return addUtcDays(date, 14 * interval)
    case "MONTHLY":
      return addUtcMonths(date, interval)
    case "QUARTERLY":
      return addUtcMonths(date, 3 * interval)
    case "YEARLY":
      return addUtcMonths(date, 12 * interval)
  }
}

function align(date: Date, rule: RecurrenceRule): Date {
  if (
    (rule.frequency === "WEEKLY" || rule.frequency === "FORTNIGHTLY") &&
    rule.weekday != null
  ) {
    const shift = (rule.weekday - date.getUTCDay() + 7) % 7
    return addUtcDays(date, shift)
  }

  if (
    rule.anchorDay != null &&
    (rule.frequency === "MONTHLY" ||
      rule.frequency === "QUARTERLY" ||
      rule.frequency === "YEARLY")
  ) {
    const day = Math.min(
      rule.anchorDay,
      daysInUtcMonth(date.getUTCFullYear(), date.getUTCMonth())
    )
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), day)
    )
  }

  return date
}

/// Every occurrence the cron still owes, oldest first. A template that has been
/// dormant — a paused group, an outage — catches up rather than losing periods.
/// `limit` stops a very stale template from generating years of history at once.
export function dueOccurrences(
  rule: RecurrenceRule,
  lastRunAt: Date | null,
  startDate: Date,
  now: Date,
  limit = 24
): Date[] {
  const occurrences: Date[] = []
  let cursor = lastRunAt ?? addUtcDays(startOfUtcDay(startDate), -1)

  while (occurrences.length < limit) {
    const next = nextOccurrence(rule, cursor)
    if (!next || next > now) break
    occurrences.push(next)
    cursor = next
  }

  return occurrences
}

export function describeRecurrence(rule: RecurrenceRule): string {
  switch (rule.frequency) {
    case "DAILY":
      return rule.interval > 1 ? `every ${rule.interval} days` : "every day"
    case "WEEKLY":
      return rule.interval > 1 ? `every ${rule.interval} weeks` : "every week"
    case "FORTNIGHTLY":
      return "every two weeks"
    case "MONTHLY":
      return rule.anchorDay
        ? `monthly on the ${ordinal(rule.anchorDay)}`
        : "every month"
    case "QUARTERLY":
      return "every three months"
    case "YEARLY":
      return "every year"
  }
}

function ordinal(day: number) {
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th"
  return `${day}${suffix}`
}
