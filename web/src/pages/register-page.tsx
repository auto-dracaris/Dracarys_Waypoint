import { useState } from 'react'
import { useForm, Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { otpSchema, registerSchema } from '@/features/store-manager/schema'
import type { OtpFormValues, RegisterFormValues } from '@/features/store-manager/types'
import { register, resendOtp, verifyOtp } from '@/features/auth/api'
import { Field, FieldLabel, FieldError } from '@/components/ui/shadcn/field'
import { Input } from '@/components/ui/shadcn/input'
import { Button } from '@/components/ui/shadcn/button'
import { Logo } from '@/features/store-manager/components/logo'

function TextField<T extends FieldValues>({
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

function RootError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-red-600 text-sm">
      {message}
    </p>
  ) : null
}

const submitClass = 'w-full h-10 bg-yellow-400 hover:bg-yellow-500 text-stone-900 font-semibold text-base rounded-sm flex items-center justify-center gap-2 shadow-none'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [pending, setPending] = useState<{ phone: string; otpId: number }>()
  const [notice, setNotice] = useState('')

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', password: '' },
  })
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  })

  async function onRegister(values: RegisterFormValues) {
    try {
      const { otpId } = await register(values)
      setPending({ phone: values.phone, otpId })
    } catch (e) {
      registerForm.setError('root', { message: (e as Error).message })
    }
  }

  async function onVerify({ otp }: OtpFormValues) {
    if (!pending) return
    try {
      await verifyOtp({ ...pending, otp })
      navigate('/login')
    } catch (e) {
      otpForm.setError('root', { message: (e as Error).message })
    }
  }

  async function onResend() {
    if (!pending) return
    try {
      const { otpId } = await resendOtp(pending.phone)
      setPending({ ...pending, otpId })
      setNotice('A new code has been sent.')
    } catch (e) {
      otpForm.setError('root', { message: (e as Error).message })
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md p-10 bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col gap-8">
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <Logo showText={false} size="lg" />
          <h1 className="text-slate-900 text-3xl font-medium tracking-tight">{pending ? 'Verify your phone' : 'Create an account'}</h1>
          <p className="text-slate-500 text-sm">{pending ? `Enter the 6-digit code sent to ${pending.phone}` : 'Enter your details below'}</p>
        </div>

        {!pending ? (
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="w-full flex flex-col gap-5">
            <div className="flex gap-3">
              <TextField control={registerForm.control} name="firstName" label="First Name" placeholder="Nimal" />
              <TextField control={registerForm.control} name="lastName" label="Last Name" placeholder="Perera" />
            </div>
            <TextField control={registerForm.control} name="phone" label="Phone Number" type="tel" placeholder="07XXXXXXXX" />
            <TextField control={registerForm.control} name="password" label="Password" type="password" placeholder="••••••••••••" />
            <RootError message={registerForm.formState.errors.root?.message} />
            <Button type="submit" disabled={registerForm.formState.isSubmitting} className={submitClass}>
              Create account <ArrowRight className="h-5 w-5" />
            </Button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(onVerify)} className="w-full flex flex-col gap-5">
            <TextField control={otpForm.control} name="otp" label="Verification Code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="123456" />
            <RootError message={otpForm.formState.errors.root?.message} />
            {notice && <p className="text-green-700 text-sm">{notice}</p>}
            <Button type="submit" disabled={otpForm.formState.isSubmitting} className={submitClass}>
              Verify <ArrowRight className="h-5 w-5" />
            </Button>
            <button type="button" onClick={onResend} className="text-blue-600 text-sm font-medium hover:underline">
              Resend code
            </button>
          </form>
        )}

        <p className="w-full pt-2 border-t border-neutral-200 text-slate-600 text-sm text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
