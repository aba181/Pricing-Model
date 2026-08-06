'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { MobileSheet } from '@/components/ui/MobileSheet'
import {
  createAircraftAction,
  type CreateAircraftState,
} from '@/app/actions/aircraft'

const FIXED_RATE_FIELDS = [
  { field: 'lease_rent_usd', label: 'Lease Rent (USD/mo)' },
  { field: 'six_year_check_usd', label: '6-Year Check (USD/mo)' },
  { field: 'twelve_year_check_usd', label: '12-Year Check (USD/mo)' },
  { field: 'ldg_usd', label: 'Landing Gear (USD/mo)' },
]

const VARIABLE_RATE_FIELDS = [
  { field: 'apu_rate_usd', label: 'APU Rate (USD/engine)' },
  { field: 'llp1_rate_usd', label: 'LLP #1 Rate (USD/engine)' },
  { field: 'llp2_rate_usd', label: 'LLP #2 Rate (USD/engine)' },
]

const ESCALATION_FIELDS = [
  { field: 'epr_escalation', label: 'EPR Escalation' },
  { field: 'llp_escalation', label: 'LLP Escalation' },
  { field: 'af_apu_escalation', label: 'AF+APU Escalation' },
]

export function CreateAircraftDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const [state, formAction, isPending] = useActionState(createAircraftAction, {})

  // On success, close dialog and redirect
  useEffect(() => {
    if (state.success && state.msn) {
      setIsOpen(false)
      router.push(`/aircraft/${state.msn}`)
    }
  }, [state.success, state.msn, router])

  const closeDialog = () => setIsOpen(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="av-btn av-btn-cyan">
        <Plus size={16} />
        Add Aircraft
      </button>

      <MobileSheet
        isOpen={isOpen}
        onClose={closeDialog}
        title="Add New Aircraft"
        maxWidth="max-w-lg"
        closeOnScrim={false}
        footer={
          <div className="flex gap-2">
            <button
              type="submit"
              form="create-aircraft-form"
              disabled={isPending}
              className="av-btn av-btn-cyan disabled:opacity-60"
            >
              {isPending ? 'Creating...' : 'Create Aircraft'}
            </button>
            <button
              type="button"
              onClick={closeDialog}
              disabled={isPending}
              className="av-btn av-btn-ghost disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        }
      >
        {isOpen && (
          <div className="p-6">
            {/* Error banner */}
            {state.error && (
              <div
                className="mb-4 px-3 py-2 rounded-lg text-[13px]"
                style={{ background: 'var(--neg-soft)', color: 'var(--neg)', border: '1px solid color-mix(in srgb, var(--neg) 30%, transparent)' }}
              >
                {state.error}
              </div>
            )}

            <form id="create-aircraft-form" action={formAction} className="space-y-5">
              {/* Aircraft Identity */}
              <div>
                <h3 className="text-[10.5px] font-bold uppercase tracking-[0.09em] mb-3" style={{ color: 'var(--muted)' }}>
                  Aircraft Identity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                      MSN *
                    </label>
                    <input
                      type="number"
                      name="msn"
                      required
                      placeholder="e.g. 3055"
                      className="av-input av-num !py-1.5 md:!text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                      Type
                    </label>
                    <select
                      name="aircraft_type"
                      defaultValue="A320"
                      className="av-input !py-1.5 md:!text-[13px]"
                    >
                      <option value="A320">A320</option>
                      <option value="A321">A321</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                      Registration
                    </label>
                    <input
                      type="text"
                      name="registration"
                      placeholder="e.g. TC-UNA"
                      className="av-input !py-1.5 md:!text-[13px]"
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Monthly Rates */}
              <RateFieldGroup title="Fixed Monthly Rates" fields={FIXED_RATE_FIELDS} />

              {/* Variable Rates */}
              <RateFieldGroup title="Variable Rates (per engine)" fields={VARIABLE_RATE_FIELDS} />

              {/* Escalation Rates */}
              <RateFieldGroup title="Escalation Rates" fields={ESCALATION_FIELDS} />
            </form>
          </div>
        )}
      </MobileSheet>
    </>
  )
}

function RateFieldGroup({
  title,
  fields,
}: {
  title: string
  fields: { field: string; label: string }[]
}) {
  return (
    <div>
      <h3 className="text-[10.5px] font-bold uppercase tracking-[0.09em] mb-3" style={{ color: 'var(--muted)' }}>{title}</h3>
      <div className="space-y-2">
        {fields.map(({ field, label }) => (
          <div
            key={field}
            className="grid grid-cols-[1fr_150px] gap-2 items-center"
          >
            <span className="text-[13.5px]" style={{ color: 'var(--ink-2)' }}>{label}</span>
            <input
              type="number"
              step="any"
              name={field}
              placeholder="0.00"
              className="av-input av-num text-right !py-1.5 md:!text-[13px]"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
