'use server'

import { calculatePnlAction, CalculateResponse } from './pricing'

interface SensitivityInput {
  baseInputs: {
    exchange_rate: string
    margin_percent: string
    msn_inputs: {
      msn: number
      mgh: string
      cycle_ratio: string
      environment: string
      period_months: number
      lease_type: string
      crew_sets: number
    }[]
  }
  paramKey: string
  baseValue: number
}

export interface SensitivityDataPoint {
  label: string
  paramValue: number
  eurPerBh: number
}

const STEPS = [-0.20, -0.10, 0, 0.10, 0.20]
const STEP_LABELS = ['-20%', '-10%', 'Base', '+10%', '+20%']

export async function runSensitivityAction(
  params: SensitivityInput
): Promise<SensitivityDataPoint[] | { error: string }> {
  const { baseInputs, paramKey, baseValue } = params
  const results: SensitivityDataPoint[] = []

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i]
    const paramValue = baseValue * (1 + step)

    // Deep clone base inputs for this step
    const inputs = JSON.parse(JSON.stringify(baseInputs)) as typeof baseInputs

    // Modify the selected parameter
    switch (paramKey) {
      case 'exchangeRate':
        inputs.exchange_rate = paramValue.toString()
        break
      case 'marginPercent':
        inputs.margin_percent = paramValue.toString()
        break
      case 'mgh':
        for (const msn of inputs.msn_inputs) {
          msn.mgh = paramValue.toString()
        }
        break
      case 'cycleRatio':
        for (const msn of inputs.msn_inputs) {
          msn.cycle_ratio = paramValue.toString()
        }
        break
      case 'crewSets':
        for (const msn of inputs.msn_inputs) {
          msn.crew_sets = Math.max(1, Math.round(paramValue))
        }
        break
      default:
        return { error: `Unknown parameter: ${paramKey}` }
    }

    const result = await calculatePnlAction(inputs)

    if ('error' in result) {
      return { error: `Calculation failed at step ${STEP_LABELS[i]}: ${result.error}` }
    }

    // Extract EUR/BH rate: use total if available, otherwise first MSN
    const calcResult = result as CalculateResponse
    let eurPerBh = 0
    if (calcResult.total) {
      eurPerBh = parseFloat(calcResult.total.final_rate_per_bh) || 0
    } else if (calcResult.msn_results.length > 0) {
      eurPerBh = parseFloat(calcResult.msn_results[0].breakdown.final_rate_per_bh) || 0
    }

    results.push({
      label: STEP_LABELS[i],
      paramValue,
      eurPerBh,
    })
  }

  return results
}
