import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/shadcn/button'
import { Input } from '@/components/ui/shadcn/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/shadcn/field'
import { Check, Calendar, Info, Package, Snowflake, ChevronDown, ArrowRight } from 'lucide-react'
import type { PlaceOrderFormInput, PlaceOrderFormValues } from '@/features/store-manager/types'
import { placeOrderSchema } from '@/features/store-manager/schema'
import { ReviewOrderDialog } from '@/features/store-manager/components/review-order-dialog'
import { fetchPlacementOptions, placeOrder, type PlacementOptions } from '@/features/store-manager/api'
import { formatDay, formatMoment, outletLabel } from '@/features/store-manager/order-format'
import { useUser } from '@/features/auth/user-context'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const today = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export function PlaceOrderPage() {
  const navigate = useNavigate()
  const { accessToken } = useUser()
  // `null` until the outlet and its open delivery days have loaded.
  const [options, setOptions] = useState<PlacementOptions | null>(null)
  const [loadError, setLoadError] = useState('')
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [pendingOrderData, setPendingOrderData] = useState<PlaceOrderFormValues | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
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
      },
      (reason: Error) => {
        if (!stale) setLoadError(reason.message)
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, setValue])

  // Watch form values to dynamically update the "Order summary" side panel
  const summary = form.watch()

  function onSubmit(data: PlaceOrderFormValues) {
    setPendingOrderData(data)
    setSubmitError('')
    setIsReviewOpen(true)
  }

  async function handleFinalSubmit() {
    if (!accessToken || !pendingOrderData) return
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

  if (!options)
    return (
      <div className="flex-1 pr-2 py-2 flex flex-col h-full">
        <div className="w-full bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-200 flex flex-col p-8 gap-3 min-h-full">
          <h1 className="text-stone-900 text-4xl font-medium font-sans tracking-tight">Place an order</h1>
          <p role={loadError ? 'alert' : 'status'} className="text-stone-500 text-sm font-sans">
            {loadError || 'Loading your outlet…'}
          </p>
        </div>
      </div>
    )

  const selectedDay = options.deliveryDays.find((day) => day.date === summary.deliveryDate)
  const chilledAllowed = options.tempRequirements.includes('chilled')

  return (
    <div className="flex-1 pr-2 py-2 flex flex-col justify-start items-start h-full overflow-y-auto">
      <div className="w-full bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-200 flex flex-col p-8 gap-8 min-h-full">
        {/* HEADER & STEPPER */}
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-col gap-1">
            <h1 className="text-stone-900 text-4xl font-medium font-sans tracking-tight">Place an order</h1>
            <p className="text-stone-500 text-sm font-normal font-sans">{today()}</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-white">
                <Check className="w-4 h-4" />
              </div>
              <div className="text-center">
                <p className="text-stone-900 text-xs font-semibold font-sans">Order details</p>
                <p className="text-stone-500 text-[10px] font-normal font-sans">Description</p>
              </div>
            </div>
            <div className="w-12 h-px bg-lime-500 mb-6" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full border-2 border-lime-500 bg-white flex items-center justify-center text-lime-600 text-xs font-bold font-sans">2</div>
              <div className="text-center">
                <p className="text-lime-700 text-xs font-semibold font-sans">Review & submit</p>
                <p className="text-lime-600 text-[10px] font-normal font-sans">Description</p>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN FORM */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full gap-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
            {/* LEFT: DELIVERY DETAILS FIELDSET */}
            <div className="lg:col-span-2 rounded-xl border border-neutral-200 flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-neutral-200">
                <h2 className="text-stone-900 text-2xl font-medium font-sans">Delivery details</h2>
              </div>

              <div className="p-6 flex flex-col gap-6 bg-white">
                {/* Row 1: Outlet & Date */}
                <div className="grid grid-cols-2 gap-6">
                  <Field className="space-y-1.5">
                    <FieldLabel className="text-stone-900 text-sm font-medium font-sans">Outlet</FieldLabel>
                    <Input
                      readOnly
                      value={`${outletLabel(options.outlet)} · ${options.outlet.uniqueId}`}
                      className="w-full h-10 px-3 rounded-md border border-neutral-300 text-stone-900 text-sm font-sans bg-neutral-50"
                    />
                  </Field>

                  <Controller
                    name="deliveryDate"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                        <FieldLabel className="text-stone-900 text-sm font-medium font-sans flex gap-1">
                          Requested delivery date <span className="text-red-500">*</span>
                        </FieldLabel>
                        <div className="relative">
                          <Calendar className="w-4 h-4 text-stone-500 absolute left-3 top-3 pointer-events-none" />
                          <select
                            {...field}
                            className="w-full h-10 pl-9 pr-8 rounded-md border border-neutral-300 text-stone-900 text-sm font-sans appearance-none bg-white font-medium cursor-pointer"
                          >
                            {!options.deliveryDays.length && <option value="">No delivery days open</option>}
                            {options.deliveryDays.map((day) => (
                              <option key={day.date} value={day.date}>
                                {formatDay(day.date, true)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-stone-500 absolute right-3 top-3 pointer-events-none" />
                        </div>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Info className="w-3.5 h-3.5 text-stone-500" />
                          <span className="text-stone-500 text-xs font-normal font-sans">
                            {selectedDay ? `Submit by ${formatMoment(selectedDay.cutoffAt)} for this run.` : 'Orders close at 16:00 on the operating day before delivery.'}
                          </span>
                        </div>
                      </Field>
                    )}
                  />
                </div>

                {/* Row 2: Temperature Requirement */}
                <Controller
                  name="temperatureMode"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <FieldLabel className="text-stone-900 text-sm font-medium font-sans">
                          Temperature requirement <span className="text-red-500">*</span>
                        </FieldLabel>
                        <div className="flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-stone-500" />
                          <span className="text-stone-500 text-xs font-normal font-sans">Submit ambient and chilled goods as separate orders.</span>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        {/* Ambient Card */}
                        <div
                          onClick={() => field.onChange('ambient')}
                          className={`flex-1 rounded-lg border p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                            field.value === 'ambient' ? 'border-yellow-400 bg-yellow-50' : 'border-neutral-200 bg-white hover:border-neutral-300'
                          }`}
                        >
                          <div className="mt-0.5">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${field.value === 'ambient' ? 'border-yellow-500' : 'border-neutral-300'}`}>
                              {field.value === 'ambient' && <div className="w-2 h-2 rounded-full bg-yellow-500" />}
                            </div>
                          </div>
                          <Package className={`w-6 h-6 ${field.value === 'ambient' ? 'text-stone-900' : 'text-stone-500'}`} />
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-sm font-medium font-sans ${field.value === 'ambient' ? 'text-stone-900' : 'text-stone-700'}`}>Ambient</span>
                            <span className="text-stone-500 text-xs font-normal font-sans">No refrigeration required</span>
                          </div>
                        </div>

                        {/* Chilled Card */}
                        <div
                          onClick={() => chilledAllowed && field.onChange('chilled')}
                          aria-disabled={!chilledAllowed}
                          className={`flex-1 rounded-lg border p-4 flex items-start gap-3 transition-colors ${chilledAllowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
                            field.value === 'chilled' ? 'border-blue-400 bg-blue-50' : 'border-neutral-200 bg-white hover:border-neutral-300'
                          }`}
                        >
                          <div className="mt-0.5">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${field.value === 'chilled' ? 'border-blue-500' : 'border-neutral-300'}`}>
                              {field.value === 'chilled' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                            </div>
                          </div>
                          <Snowflake className={`w-6 h-6 ${field.value === 'chilled' ? 'text-stone-900' : 'text-stone-500'}`} />
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-sm font-medium font-sans ${field.value === 'chilled' ? 'text-stone-900' : 'text-stone-700'}`}>Chilled</span>
                            <span className="text-stone-500 text-xs font-normal font-sans">
                              {chilledAllowed ? 'Refrigerated vehicle required' : `Not available for ${options.outlet.brand} outlets`}
                            </span>
                          </div>
                        </div>
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Row 3: Dimensions */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Quantity */}
                  <Controller
                    name="quantity"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                        <FieldLabel className="text-stone-900 text-sm font-medium font-sans flex gap-1">
                          Quantity <span className="text-red-500">*</span>
                        </FieldLabel>
                        <div
                          className={`flex rounded-md border overflow-hidden bg-white focus-within:ring-1 focus-within:ring-yellow-400 ${fieldState.invalid ? 'border-red-500' : 'border-neutral-300'}`}
                        >
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            // Add this onChange to convert the string to a number:
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="w-full h-10 px-3 text-stone-900 text-sm font-sans border-0 focus-visible:ring-0 rounded-none shadow-none"
                          />
                          <div className="bg-neutral-50 border-l border-neutral-300 flex items-center px-4 text-stone-500 text-sm font-sans">cases</div>
                        </div>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  {/* Weight */}
                  <Controller
                    name="weight"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                        <FieldLabel className="text-stone-900 text-sm font-medium font-sans flex gap-1">
                          Total weight <span className="text-red-500">*</span>
                        </FieldLabel>
                        <div
                          className={`flex rounded-md border overflow-hidden bg-white focus-within:ring-1 focus-within:ring-yellow-400 ${fieldState.invalid ? 'border-red-500' : 'border-neutral-300'}`}
                        >
                          <Input
                            {...field}
                            type="number"
                            step="0.1"
                            // Add this onChange:
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="w-full h-10 px-3 text-stone-900 text-sm font-sans border-0 focus-visible:ring-0 rounded-none shadow-none"
                          />
                          <div className="bg-neutral-50 border-l border-neutral-300 flex items-center px-4 text-stone-500 text-sm font-sans">kg</div>
                        </div>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  {/* Volume */}
                  <Controller
                    name="volume"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                        <FieldLabel className="text-stone-900 text-sm font-medium font-sans flex gap-1">
                          Total volume <span className="text-red-500">*</span>
                        </FieldLabel>
                        <div
                          className={`flex rounded-md border overflow-hidden bg-white focus-within:ring-1 focus-within:ring-yellow-400 ${fieldState.invalid ? 'border-red-500' : 'border-neutral-300'}`}
                        >
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            // Add this onChange:
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="w-full h-10 px-3 text-stone-900 text-sm font-sans border-0 focus-visible:ring-0 rounded-none shadow-none"
                          />
                          <div className="bg-neutral-50 border-l border-neutral-300 flex items-center px-4 text-stone-500 text-sm font-sans">m³</div>
                        </div>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>

                {/* Row 4: Notes */}
                <Controller
                  name="notes"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                      <FieldLabel className="text-stone-900 text-sm font-medium font-sans">Delivery notes (optional)</FieldLabel>
                      <textarea
                        {...field}
                        placeholder="Add instructions relevant to this delivery"
                        className="w-full h-24 p-3 rounded-md border border-neutral-300 text-stone-900 text-sm font-sans outline-none resize-none placeholder:text-stone-400 focus:ring-1 focus:ring-yellow-400"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </div>

            {/* RIGHT: ORDER SUMMARY (Dynamically populated from Form State) */}
            <div className="lg:col-span-1 rounded-xl border border-neutral-200 bg-white flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-neutral-200">
                <h2 className="text-stone-900 text-2xl font-medium font-sans">Order summary</h2>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center py-1">
                  <span className="text-stone-500 text-sm font-sans">Outlet</span>
                  <span className="text-stone-900 text-sm font-medium font-sans">{outletLabel(options.outlet)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-stone-500 text-sm font-sans">Requested date</span>
                  <span className="text-stone-900 text-sm font-medium font-sans">{summary.deliveryDate ? formatDay(summary.deliveryDate, true) : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-stone-500 text-sm font-sans">Requirement</span>
                  <span className="text-stone-900 text-sm font-medium font-sans capitalize">{summary.temperatureMode}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-stone-500 text-sm font-sans">Quantity</span>
                  <span className="text-stone-900 text-sm font-medium font-sans">{summary.quantity || 0} cases</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-stone-500 text-sm font-sans">Weight</span>
                  <span className="text-stone-900 text-sm font-medium font-sans">{summary.weight || 0} kg</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-stone-500 text-sm font-sans">Volume</span>
                  <span className="text-stone-900 text-sm font-medium font-sans">{summary.volume || 0} m³</span>
                </div>

                {/* Info Box */}
                <div className="mt-2 flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <Calendar className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-slate-700 text-xs font-medium font-sans leading-5">
                    Orders are planned after the cutoff. We'll notify you when your delivery is scheduled or if your order is deferred.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ACTION BAR */}
          <div className="mt-auto w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-stone-400" />
              <span className="text-stone-500 text-sm font-medium font-sans">{form.formState.isDirty ? 'Unsaved changes' : 'Not submitted yet'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/store-manager/orders')}
                className="px-6 h-10 border-neutral-300 text-stone-700 font-semibold font-sans bg-white hover:bg-neutral-100 shadow-none"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!options.deliveryDays.length} className="px-6 h-10 bg-yellow-400 hover:bg-yellow-500 text-stone-900 font-semibold font-sans shadow-none gap-2">
                Review order <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>
      <ReviewOrderDialog
        open={isReviewOpen}
        onOpenChange={setIsReviewOpen}
        data={pendingOrderData}
        outlet={options.outlet}
        onConfirm={() => void handleFinalSubmit()}
        submitting={submitting}
        error={submitError}
      />
    </div>
  )
}
