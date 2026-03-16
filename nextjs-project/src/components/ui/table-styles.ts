/**
 * Shared CSS class constants for config table components.
 *
 * Extracted from CrewConfigTable to ensure consistent styling
 * across Crew, Costs, and any future config tables.
 */

/** Base header cell style */
export const thBase =
  'px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'

/** Base data cell style */
export const tdBase = 'px-3 py-1.5 text-sm'

/** Numeric right-aligned data cell */
export const tdNum = `${tdBase} text-right font-mono text-gray-900 dark:text-gray-100`

/** Label data cell (left-aligned descriptive text) */
export const tdLabel = `${tdBase} text-gray-700 dark:text-gray-300`

/** Computed/formula data cell (right-aligned, muted) */
export const tdComputed = `${tdBase} text-right font-mono text-gray-500 dark:text-gray-400`

/** Standard row border */
export const borderRow = 'border-b border-gray-200/60 dark:border-gray-800/60'
