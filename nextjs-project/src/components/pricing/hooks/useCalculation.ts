import { useEffect, useRef } from 'react'
import { usePricingStore } from '@/stores/pricing-store'
import type { MsnInput } from '@/stores/pricing-store'
import { computePeriodMonths } from '@/stores/pricing-store'
import { calculatePnlAction } from '@/app/actions/pricing'
import type { CalculateResponse } from '@/app/actions/pricing'
import { toStoreMsnResult, toStoreBreakdown } from '@/lib/api-converters'

/**
 * Custom hook that runs a debounced P&L calculation whenever
 * msnInputs, exchangeRate, or marginPercent change.
 *
 * Manages the debounce timer internally and updates the pricing
 * store with the calculation results.
 */
export function useCalculation(
  msnInputs: MsnInput[],
  exchangeRate: string,
  marginPercent: string,
): void {
  const { setResults, setIsCalculating, setLastError } = usePricingStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (msnInputs.length === 0) {
      setResults([], null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsCalculating(true)
      setLastError(null)

      const result = await calculatePnlAction({
        exchange_rate: exchangeRate,
        margin_percent: marginPercent,
        msn_inputs: msnInputs.map((i) => ({
          msn: i.msn,
          mgh: i.mgh,
          cycle_ratio: i.cycleRatio,
          environment: i.environment,
          period_months: computePeriodMonths(i.periodStart, i.periodEnd),
          lease_type: i.leaseType,
          crew_sets: i.crewSets,
        })),
      })

      if ('error' in result) {
        setLastError(result.error)
        setIsCalculating(false)
        return
      }

      const calcResponse = result as CalculateResponse
      const converted = calcResponse.msn_results.map(toStoreMsnResult)
      const total = calcResponse.total
        ? toStoreBreakdown(calcResponse.total)
        : null

      setResults(converted, total)
      setIsCalculating(false)
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msnInputs, exchangeRate, marginPercent])
}
