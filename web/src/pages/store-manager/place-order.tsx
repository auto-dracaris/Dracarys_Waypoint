import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import CheckRounded from '@mui/icons-material/CheckRounded'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import ViewInArOutlined from '@mui/icons-material/ViewInArOutlined'
import AcUnitRounded from '@mui/icons-material/AcUnitRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import type { PlaceOrderFormInput, PlaceOrderFormValues } from '@/features/store-manager/types'
import { placeOrderSchema } from '@/features/store-manager/schema'
import { ReviewOrderDialog } from '@/features/store-manager/components/review-order-dialog'
import { fetchPlacementOptions, placeOrder, type PlacementOptions } from '@/features/store-manager/api'
import { formatDay, formatMoment, outletLabel } from '@/features/store-manager/order-format'
import { useUser } from '@/features/auth/user-context'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded'
import { IconButton } from '@/components/ui/icon-button'
import { draftOrderNotes } from '@/features/assistant/issue-drafts'
import '@/features/assistant/draft-notes.css'
import '@/styles/store-manager/place-order.css'

const today = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export function PlaceOrderPage() {
  const navigate = useNavigate()
  const { accessToken } = useUser()
  // `null` until the outlet and its open delivery days have loaded.
  const [options, setOptions] = useState<PlacementOptions | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [pendingOrderData, setPendingOrderData] = useState<PlaceOrderFormValues | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const draftRequest = useRef<AbortController | null>(null)
  const notesInput = useRef<HTMLTextAreaElement | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [draftMessage, setDraftMessage] = useState('')
  const [draftError, setDraftError] = useState('')
  const form = useForm<PlaceOrderFormInput, unknown, PlaceOrderFormValues>({
    resolver: zodResolver(placeOrderSchema),
    // The quantities start empty; the delivery day is filled in once the open days load.
    defaultValues: { deliveryDate: '', temperatureMode: 'ambient', quantity: 0, weight: 0, volume: 0, notes: '' },
    mode: 'onChange',
  })
  const { setValue } = form
  useEffect(() => {
    if (!accessToken) return
    let stale = false
    fetchPlacementOptions(accessToken).then(
      (loaded) => {
        if (stale) return
        setOptions(loaded)
        // The earliest day still open is the one most orders are for.
        if (loaded.deliveryDays[0]) setValue('deliveryDate', loaded.deliveryDays[0].date)
        if (loaded.tempRequirements[0]) setValue('temperatureMode', loaded.tempRequirements.includes('ambient') ? 'ambient' : loaded.tempRequirements[0])
      },
      (reason: Error) => {
        if (!stale) setLoadError(reason.message)
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, setValue, loadAttempt])
  useEffect(() => () => { draftRequest.current?.abort() }, [accessToken])

  async function generateNotes() {
    if (draftRequest.current || !accessToken || !options) return
    setDraftMessage(''); setDraftError('')
    const values = form.getValues()
    const parsed = placeOrderSchema.safeParse(values)
    if (!parsed.success) {
      setDraftError('Select a delivery date and enter the quantity, weight and volume first.'); return
    }
    if (!options.deliveryDays.some((day) => day.date === values.deliveryDate)
      || !options.tempRequirements.includes(values.temperatureMode)) {
      setDraftError('Select an available date and temperature requirement first.'); return
    }
    const snapshot = JSON.stringify(values)
    const controller = new AbortController()
    draftRequest.current = controller; setDrafting(true)
    try {
      const result = await draftOrderNotes(accessToken, {
        requested_date: values.deliveryDate, temperature_requirement: values.temperatureMode,
        quantity: values.quantity, weight_kg: values.weight, volume_m3: values.volume,
        notes: values.notes ?? '',
      }, controller.signal)
      if (draftRequest.current !== controller || controller.signal.aborted) return
      if (JSON.stringify(form.getValues()) !== snapshot) {
        setDraftMessage('Your order details changed. Click the sparkle again for an updated note.'); return
      }
      if (result.origin === 'form' && values.notes?.trim()) {
        setDraftMessage('AI drafting was unavailable. Your existing notes were kept.'); return
      }
      form.setValue('notes', result.draft, { shouldDirty: true, shouldValidate: true })
      setDraftMessage(result.origin === 'ai' ? 'AI draft ready. Review and edit it before placing your order.' : 'Note prepared from your order details. Review it before placing your order.')
      notesInput.current?.focus()
    } catch (error) {
      if (!controller.signal.aborted) setDraftError(error instanceof Error ? error.message : 'Could not draft your note. Please try again.')
    } finally {
      if (draftRequest.current === controller) { draftRequest.current = null; setDrafting(false) }
    }
  }

  // Watch form values to dynamically update the "Order summary" side panel
  const summary = useWatch({ control: form.control })

  function onSubmit(data: PlaceOrderFormValues) {
    if (drafting || !options) return
    if (!options.deliveryDays.some((day) => day.date === data.deliveryDate) || !options.tempRequirements.includes(data.temperatureMode)) return
    setPendingOrderData(data)
    setSubmitError('')
    setIsReviewOpen(true)
  }

  async function handleFinalSubmit() {
    if (!accessToken || !pendingOrderData || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const order = await placeOrder(accessToken, pendingOrderData)
      navigate('/store-manager/orders', { state: { message: `Order ${order.reference} placed for ${formatDay(order.requestedDate)}.` } })
    } catch (reason) {
      setSubmitError((reason as Error).message)
      setSubmitting(false)
    }
  }


  if (!options) return <div className="store-place-page"><div className="store-place-surface">
    <h1 className="type-display-lg-medium">Place an order</h1>
    <p role={loadError ? 'alert' : 'status'} className={`type-text-sm-regular ${loadError ? 'store-place-error' : ''}`}>{loadError || 'Loading your outlet…'}</p>
    {loadError && <Button size="sm" onClick={() => { setLoadError(''); setLoadAttempt((value) => value + 1) }}>Try again</Button>}
  </div></div>
  const selectedDay = options.deliveryDays.find((day) => day.date === summary.deliveryDate)
  const ready = form.formState.isValid || isReviewOpen
  const metrics = [
    { name: 'quantity', label: 'Quantity', unit: 'Cases', step: '1', min: '1' },
    { name: 'weight', label: 'Total weight', unit: 'kg', step: '0.1', min: '0.1' },
    { name: 'volume', label: 'Total volume', unit: 'm³', step: '0.01', min: '0.01' },
  ] as const
  const rows = [
    ['Outlet', outletLabel(options.outlet)],
    ['Requested date', summary.deliveryDate ? new Date(`${summary.deliveryDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
    ['Requirement', summary.temperatureMode === 'chilled' ? 'Chilled' : 'Ambient'],
    ['Quantity', `${summary.quantity || 0} cases`], ['Weight', `${summary.weight || 0} kg`], ['Volume', `${summary.volume || 0} m³`],
  ]
  return <div className="store-place-page"><div className="store-place-surface">
    <header className="store-place-header">
      <div><h1 className="type-display-lg-medium">Place an order</h1><p className="type-text-sm-regular">{today()}</p></div>
      <ol className="store-place-stepper" aria-label="Order progress">
        <li className={ready ? 'store-place-step--done' : 'store-place-step--current'} aria-current={isReviewOpen ? undefined : 'step'}>
          <span className="store-place-step-icon">{ready ? <CheckRounded aria-hidden="true" /> : '1'}</span><span className="type-text-sm-medium">Order details</span><span className="type-text-xs-regular">Delivery details</span>
        </li>
        <li className={ready ? 'store-place-step--current' : ''} aria-current={isReviewOpen ? 'step' : undefined}><span className="store-place-step-icon">2</span><span className="type-text-sm-medium">Review &amp; submit</span><span className="type-text-xs-regular">Confirm your order</span></li>
      </ol>
    </header>
    <form onSubmit={form.handleSubmit(onSubmit)} className="store-place-form" noValidate>
      <div className="store-place-workspace">
        <section className="store-place-card" aria-labelledby="delivery-details-heading">
          <h2 id="delivery-details-heading" className="type-display-md-medium">Delivery details</h2>
          <div className="store-place-fields">
            <div className="store-place-delivery-fields">
              <div className="store-place-field"><label htmlFor="order-outlet" className="type-text-sm-medium">Outlet</label><Input id="order-outlet" readOnly value={outletLabel(options.outlet)} /></div>
              <Controller name="deliveryDate" control={form.control} render={({ field, fieldState }) => <div className="store-place-field">
                <label htmlFor="order-delivery-date" className="type-text-sm-medium">Requested delivery date <span aria-hidden="true" className="store-place-required">*</span></label>
                <div className="store-place-date-control"><CalendarMonthRounded aria-hidden="true" /><Select {...field} id="order-delivery-date" required invalid={fieldState.invalid} aria-describedby="order-cutoff order-date-error">
                  {!options.deliveryDays.length && <option value="">No delivery days open</option>}
                  {options.deliveryDays.map((day) => <option key={day.date} value={day.date}>{formatDay(day.date, true)}</option>)}
                </Select></div>
                <p id="order-date-error" className="store-place-error type-text-xs-regular">{fieldState.error?.message}</p>
                <p id="order-cutoff" className="store-place-help type-text-sm-regular"><InfoOutlined aria-hidden="true" />{selectedDay ? `Submit by ${formatMoment(selectedDay.cutoffAt)} for this run.` : 'No delivery days are currently open.'}</p>
              </div>} />
            </div>
            <Controller name="temperatureMode" control={form.control} render={({ field, fieldState }) => <fieldset className="store-place-temperature">
              <legend className="type-text-md-medium">Temperature requirement</legend>
              <p className="store-place-help type-text-sm-regular" id="order-temperature-help"><InfoOutlined aria-hidden="true" />Submit ambient and chilled goods as separate orders.</p>
              <div className="store-place-requirements">
                {(['ambient', 'chilled'] as const).map((mode) => {
                  const allowed = options.tempRequirements.includes(mode)
                  return <label key={mode} className={`store-place-requirement ${field.value === mode ? 'store-place-requirement--selected' : ''}`}>
                    <input ref={mode === 'ambient' ? field.ref : undefined} type="radio" name={field.name} value={mode} checked={field.value === mode} onChange={() => field.onChange(mode)} onBlur={field.onBlur} disabled={!allowed} aria-describedby="order-temperature-help" />
                    {mode === 'ambient' ? <ViewInArOutlined aria-hidden="true" /> : <AcUnitRounded aria-hidden="true" />}
                    <span><span className="type-text-md-regular">{mode === 'ambient' ? 'Ambient' : 'Chilled'}</span><span className="type-text-sm-regular">{allowed ? mode === 'ambient' ? 'No refrigeration required' : 'Refrigerated vehicle required' : `Not available for ${options.outlet.brand} outlets`}</span></span>
                  </label>
                })}
              </div>
              {fieldState.error && <p className="store-place-error type-text-xs-regular">{fieldState.error.message}</p>}
            </fieldset>} />
            <div className="store-place-metrics">
              {metrics.map(({ name, label, unit, step, min }) => <Controller key={name} name={name} control={form.control} render={({ field, fieldState }) => <div className="store-place-field">
                <label htmlFor={`order-${name}`} className="type-text-md-regular">{label} <span className="store-place-required" aria-hidden="true">*</span></label>
                <div className="store-place-metric-control"><Input {...field} id={`order-${name}`} value={field.value || ''} onChange={(event) => field.onChange(event.target.value === '' ? 0 : Number(event.target.value))} type="number" inputMode={name === 'quantity' ? 'numeric' : 'decimal'} required min={min} step={step} invalid={fieldState.invalid} aria-describedby={`order-${name}-error`} /><span className="type-text-md-regular">{unit}</span></div>
                <p id={`order-${name}-error`} className="store-place-error type-text-xs-regular">{fieldState.error?.message}</p>
              </div>} />)}
            </div>
            <Controller name="notes" control={form.control} render={({ field, fieldState }) => <div className="store-place-field">
              <label htmlFor="order-notes" className="type-text-sm-medium">Delivery notes (optional)</label>
              <div className="issue-notes-wrap"><Textarea {...field} id="order-notes" ref={(element) => { field.ref(element); notesInput.current = element }} maxLength={500} aria-describedby="order-draft-feedback order-notes-error" placeholder="Add instructions relevant to this delivery" invalid={fieldState.invalid} />
                <IconButton size="sm" className="issue-draft-button" aria-label="Draft delivery notes with AI" title={drafting ? 'Drafting your note…' : 'Draft with AI'} aria-busy={drafting} disabled={drafting || !accessToken || isReviewOpen || submitting} onClick={() => void generateNotes()}><AutoAwesomeRounded className={drafting ? 'motion-safe:animate-pulse' : ''} /></IconButton>
              </div>
              <div id="order-draft-feedback" className="type-text-xs-regular">{drafting && <p role="status">Drafting your delivery note…</p>}{draftMessage && <p role="status">{draftMessage}</p>}{draftError && <p role="alert" className="store-place-error">{draftError}</p>}</div>
              <p id="order-notes-error" className="store-place-error type-text-xs-regular">{fieldState.error?.message}</p>
            </div>} />
          </div>
        </section>
        <section className="store-place-card store-place-summary" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading" className="type-display-md-medium">Order summary</h2>
          <dl>{rows.map(([label, value]) => <div key={label}><dt className="type-text-md-regular">{label}</dt><dd className="type-text-md-medium">{value}</dd></div>)}</dl>
          <div className="store-place-scheduling"><span><CalendarMonthRounded aria-hidden="true" /></span><p className="type-text-sm-regular">Orders are planned after the cutoff. We’ll notify you when your delivery is scheduled or if your order is deferred.</p></div>
        </section>
      </div>
      <footer className="store-place-actions"><p className="type-text-sm-regular"><InfoOutlined aria-hidden="true" />Not submitted yet</p><div>
        <Button size="md" onClick={() => navigate('/store-manager/orders')}>Cancel</Button>
        <Button type="submit" variant="primary" size="md" trailingIcon={<ArrowForwardRounded />} disabled={!options.deliveryDays.length || !options.tempRequirements.length || drafting}>Review order</Button>
      </div></footer>
    </form>
  </div>
  <ReviewOrderDialog open={isReviewOpen} onOpenChange={setIsReviewOpen} data={pendingOrderData} outlet={options.outlet} onConfirm={() => void handleFinalSubmit()} submitting={submitting} error={submitError} />
  </div>
}
