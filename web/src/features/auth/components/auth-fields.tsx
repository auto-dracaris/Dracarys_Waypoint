import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { ArrowRight } from 'lucide-react'
import { Field, FieldLabel, FieldError } from '@/components/ui/shadcn/field'
import { Input } from '@/components/ui/shadcn/input'
import { Button } from '@/components/ui/shadcn/button'

// The form pieces the sign-in screens share: register and forgot password.

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: {
  control: Control<T>
  name: Path<T>
  label: string
} & React.ComponentProps<typeof Input>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="w-full space-y-1">
          <FieldLabel className="text-slate-600 text-sm font-medium flex gap-1">
            {label} <span className="text-red-500">*</span>
          </FieldLabel>
          <Input {...field} {...inputProps} aria-invalid={fieldState.invalid} className="h-11 px-3 bg-neutral-50 rounded-lg border-neutral-300 text-slate-900 text-sm" />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export function RootError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-red-600 text-sm">
      {message}
    </p>
  ) : null
}

export function SubmitButton({ disabled, children }: { disabled: boolean; children: React.ReactNode }) {
  return (
    <Button
      type="submit"
      disabled={disabled}
      className="w-full h-10 bg-yellow-400 hover:bg-yellow-500 text-stone-900 font-semibold text-base rounded-sm flex items-center justify-center gap-2 shadow-none"
    >
      {children} <ArrowRight className="h-5 w-5" />
    </Button>
  )
}
