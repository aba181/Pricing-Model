/**
 * Centralized formatting utilities for the ACMI Pricing Platform.
 *
 * All number/currency/percentage formatting goes through this module
 * to ensure consistent display across the application.
 */

// ---- Number formatters ----

/**
 * Core number formatter with configurable decimals and fallback.
 * Handles null, undefined, NaN, and Infinity gracefully.
 */
export function fmt(
  value: number | null | undefined,
  decimals: number = 2,
  fallback: string = '-',
): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value))
    return fallback
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Integer formatting (0 decimals). */
export function fmtInt(value: number | null | undefined): string {
  return fmt(value, 0)
}

/** EUR currency formatting with symbol prefix. */
export function fmtEur(
  value: number | null | undefined,
  decimals: number = 2,
): string {
  if (value === null || value === undefined || isNaN(value)) return '-'
  return '\u20AC ' + fmt(value, decimals)
}

/** Percentage: multiplies by 100 and appends '%'. */
export function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value))
    return '-'
  return (value * 100).toFixed(1) + '%'
}

/** Decimal formatting via toFixed (no locale grouping). */
export function fmtDec(
  value: number | null | undefined,
  decimals: number = 1,
): string {
  if (value === null || value === undefined || isNaN(value)) return '-'
  return value.toFixed(decimals)
}

/** Rate formatting: always 2 decimals, '0.00' fallback on invalid. */
export function fmtRate(value: number | null | undefined): string {
  return fmt(value, 2, '0.00')
}

/** CSS class name for negative values (red text). */
export function valColor(value: number): string {
  if (value < 0) return 'text-red-400'
  return ''
}

// ---- String-input formatters (for EprMatrixTable raw DB values) ----

/** Parse a string value and display with 2 decimal places. */
export function formatValue(value: string | null): string {
  if (value === null || value === undefined) return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return '-'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Parse a string ratio and display with 2-4 decimal places. */
export function formatRatio(value: string | null): string {
  if (value === null || value === undefined) return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return '-'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}
