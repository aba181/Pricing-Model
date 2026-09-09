/**
 * Partial-month proration utilities.
 *
 * Computes day fractions for first/last months when a project starts or ends
 * mid-month. Pure functions — no React, no side effects.
 */

/** Per-month day information for proration */
export interface MonthDayInfo {
  activeDays: number // How many days the MSN operates in this month (0 = not in period)
  totalDays: number  // Total calendar days in the month (28-31)
}

/** Number of calendar days in a given month/year */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Parse a period string that may be YYYY-MM or YYYY-MM-DD.
 * Returns { year, month, day } where day defaults to -1 if YYYY-MM (no day component).
 */
export function parsePeriod(period: string | null | undefined): {
  year: number
  month: number
  day: number
  hasDay: boolean
} {
  if (!period) return { year: NaN, month: NaN, day: 1, hasDay: false }
  const parts = period.split('-').map(Number)
  const hasDay = parts.length >= 3 && !isNaN(parts[2])
  return {
    year: parts[0],
    month: parts[1],
    day: hasDay ? parts[2] : 1,
    hasDay,
  }
}

/**
 * Build MonthDayInfo[] for a month range given start/end period strings.
 *
 * Each month's active days are derived from the period DATES, not from the
 * month's position in `months`: the start month runs from startDay to its last
 * day, the end month from the 1st to endDay, middle months are full, and any
 * month outside [start, end] has 0 active days. This makes the result correct
 * whether `months` is exactly the MSN's own term or a wider grid (e.g. the
 * project-wide range the P&L total view iterates, or the full MSN range a
 * season is laid over) — an MSN that starts on the 15th bears 15/31 of that
 * month regardless of where the month sits in the array.
 *
 * For YYYY-MM format (backward compat) every in-period month is full
 * (activeDays === totalDays). Unparseable periods yield all-full months.
 */
export function buildMonthDayInfos(
  months: { year: number; month: number }[],
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined,
): MonthDayInfo[] {
  const start = parsePeriod(periodStart)
  const end = parsePeriod(periodEnd)
  const startYm = start.year * 12 + start.month
  const endYm = end.year * 12 + end.month
  const bounded = !isNaN(startYm) && !isNaN(endYm)

  return months.map((m) => {
    const total = daysInMonth(m.year, m.month)
    if (!bounded) return { activeDays: total, totalDays: total }

    const ym = m.year * 12 + m.month
    if (ym < startYm || ym > endYm) return { activeDays: 0, totalDays: total }

    const clampDay = (d: number) => Math.min(Math.max(d, 1), total)
    const firstDay = ym === startYm && start.hasDay ? clampDay(start.day) : 1
    const lastDay = ym === endYm && end.hasDay ? clampDay(end.day) : total

    return { activeDays: Math.max(1, lastDay - firstDay + 1), totalDays: total }
  })
}
