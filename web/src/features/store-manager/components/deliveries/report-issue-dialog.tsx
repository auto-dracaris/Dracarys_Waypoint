import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog'
import { Button } from '@/components/ui/shadcn/button'
import { Input } from '@/components/ui/shadcn/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/shadcn/field'
import { ChevronDown } from 'lucide-react'
import { reportIssueSchema } from '@/features/store-manager/schema'
import type { ReportIssueFormValues } from '@/features/store-manager/types'

// What a store manager can report on receipt, and what the affected cases are called.
const issueTypes: Record<ReportIssueFormValues['issueType'], { label: string; cases: string }> = {
  receipt_damage: { label: 'Damaged goods', cases: 'Damaged cases' },
  receipt_shortfall: { label: 'Missing goods', cases: 'Missing cases' },
  other: { label: 'Wrong items or something else', cases: 'Affected cases' },
}

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliveryId: string // e.g., "ORD0000012"
  outletLabel: string // e.g., "Fresh · Ja-Ela"
  totalOrdered: number
  // What the driver recorded handing over.
  deliveredUnits: number
  // Rejects with the reason the report was not taken.
  onSubmitIssue: (data: ReportIssueFormValues) => Promise<void>
}

export function ReportIssueDialog({ open, onOpenChange, deliveryId, outletLabel, totalOrdered, deliveredUnits, onSubmitIssue }: ReportIssueDialogProps) {
  const [submitError, setSubmitError] = useState('')
  // 2. Initialize Form
  const form = useForm<ReportIssueFormValues>({
    resolver: zodResolver(reportIssueSchema),
    defaultValues: {
      issueType: 'receipt_damage',
      acceptedCases: deliveredUnits,
      damagedCases: 0,
      notes: '',
    },
    mode: 'onChange',
  })

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        issueType: 'receipt_damage',
        acceptedCases: deliveredUnits,
        damagedCases: 0,
        notes: '',
      })
    }
  }, [open, deliveredUnits, form])

  // Watch values for dynamic UI updates
  const issueType = form.watch('issueType')
  const accepted = form.watch('acceptedCases') || 0
  const damaged = form.watch('damagedCases') || 0
  const totalCalculated = accepted + damaged
  const casesLabel = issueTypes[issueType]?.cases ?? 'Affected cases'

  // A closed dialog forgets the last failed attempt.
  const changeOpen = (next: boolean) => {
    if (!next) setSubmitError('')
    onOpenChange(next)
  }

  const handleSubmit = async (data: ReportIssueFormValues) => {
    setSubmitError('')
    try {
      await onSubmitIssue(data)
      changeOpen(false)
    } catch (reason) {
      setSubmitError((reason as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="sm:max-w-[640px] p-0 bg-neutral-50 border-neutral-200 gap-0 overflow-hidden">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col">
          {/* Header Area */}
          <div className="p-6 pb-5 flex flex-col gap-5">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="text-stone-900 text-2xl font-medium font-sans">Report a delivery issue</DialogTitle>
              <p className="text-stone-900 text-sm font-normal font-sans pt-1">
                {deliveryId} · {outletLabel}
                <br />
                Check the quantities before sending your report.
              </p>
            </DialogHeader>

            {/* Static Table: Ordered vs Recorded */}
            <div className="rounded-md border border-neutral-200 overflow-hidden flex flex-col">
              <div className="flex bg-neutral-50 border-b border-neutral-200 h-11 items-center">
                <div className="w-48 md:w-72 px-4 bg-neutral-100 border-r border-neutral-200 h-full flex items-center text-stone-500 text-sm font-medium font-sans">Ordered</div>
                <div className="flex-1 px-4 text-stone-900 text-sm font-sans">{totalOrdered} cases</div>
              </div>
              <div className="flex bg-neutral-50 h-11 items-center">
                <div className="w-48 md:w-72 px-4 bg-neutral-100 border-r border-neutral-200 h-full flex items-center text-stone-500 text-sm font-medium font-sans">Driver recorded</div>
                <div className="flex-1 px-4 text-stone-900 text-sm font-sans">{deliveredUnits} cases delivered</div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-4">
              {/* Issue Type */}
              <Controller
                name="issueType"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="space-y-1">
                    <FieldLabel className="text-stone-500 text-sm font-medium font-sans">Issue type</FieldLabel>
                    <div className="relative">
                      <select
                        {...field}
                        className="w-full h-11 px-3 pr-8 rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-300 text-stone-900 text-sm font-sans appearance-none bg-neutral-50 focus:outline-yellow-400"
                      >
                        {Object.entries(issueTypes).map(([value, { label }]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-stone-500 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Quantities Split */}
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="acceptedCases"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="space-y-1">
                      <FieldLabel className="text-stone-500 text-sm font-medium font-sans">Accepted cases</FieldLabel>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="h-11 px-3 bg-neutral-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-300 text-stone-900 text-sm font-sans border-0 focus-visible:ring-1 focus-visible:ring-yellow-400 shadow-none"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="damagedCases"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="space-y-1">
                      <FieldLabel className="text-stone-500 text-sm font-medium font-sans">{casesLabel}</FieldLabel>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="h-11 px-3 bg-neutral-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-300 text-stone-900 text-sm font-sans border-0 focus-visible:ring-1 focus-visible:ring-yellow-400 shadow-none"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Dynamic Math Helper Text */}
              <p className={`text-sm font-normal font-sans ${totalCalculated !== deliveredUnits ? 'text-red-500 font-medium' : 'text-stone-900'}`}>
                {accepted} accepted + {damaged} {casesLabel.toLowerCase()} = {totalCalculated} cases
                {totalCalculated !== deliveredUnits && ` (Warning: the driver recorded ${deliveredUnits} delivered)`}
              </p>

              {/* Textarea */}
              <Controller
                name="notes"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="space-y-1">
                    <FieldLabel className="text-stone-500 text-sm font-medium font-sans">What happened? (optional)</FieldLabel>
                    <textarea
                      {...field}
                      className="w-full h-28 px-3 py-2 bg-neutral-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-300 text-stone-900 text-sm font-sans resize-none focus:outline-yellow-400"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </div>

          {/* Add Photos Section */}
          <div className="px-6 py-4 bg-neutral-100 flex flex-col gap-2">
            {/* ponytail: photos are optional; wire this to POST /images (purpose issue_photo) and send photoImageId with the issue. */}
            <Button type="button" variant="outline" disabled className="w-full h-10 bg-white border-neutral-200 text-stone-800 font-semibold font-sans shadow-none">
              Add photos
            </Button>
            <p className="text-stone-900 text-sm font-normal font-sans">Optional · Photo upload is not available yet</p>
          </div>

          {/* Info Box */}
          <div className="px-6 py-4">
            <div className="w-full p-4 bg-blue-50 rounded-md flex flex-col gap-1">
              <h4 className="text-stone-900 text-sm font-semibold font-sans">Your delivery will remain open</h4>
              <p className="text-stone-900 text-sm font-normal font-sans">
                Submitting records {accepted} accepted cases and sends the {damaged} {casesLabel.toLowerCase()} to the depot for review. Confirm the receipt once it is settled.
              </p>
            </div>
          </div>

          {submitError && (
            <p role="alert" className="mx-6 mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm font-medium font-sans">
              {submitError}
            </p>
          )}

          {/* Footer Actions */}
          <div className="px-6 pb-6 flex gap-4">
            <Button type="button" variant="outline" onClick={() => changeOpen(false)} className="w-44 h-10 bg-white border-neutral-200 text-stone-800 font-semibold font-sans shadow-none">
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1 h-10 bg-yellow-400 hover:bg-yellow-500 text-stone-900 font-semibold font-sans shadow-none">
              {form.formState.isSubmitting ? 'Submitting…' : 'Submit issue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
