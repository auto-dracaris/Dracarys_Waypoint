import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPasswordSchema, resetPasswordSchema } from '@/features/store-manager/schema'
import type { ForgotPasswordFormValues, ResetPasswordFormValues } from '@/features/store-manager/types'
import { forgotPassword, resetPassword } from '@/features/auth/api'
import { RootError, SubmitButton, TextField } from '@/features/auth/components/auth-fields'
import { Logo } from '@/features/store-manager/components/logo'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  // The number a code was asked for; set once the first step is done.
  const [phone, setPhone] = useState('')
  const [notice, setNotice] = useState('')

  const phoneForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { phone: '' },
  })
  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: '', newPassword: '' },
  })

  async function onRequest(values: ForgotPasswordFormValues) {
    try {
      await forgotPassword(values.phone)
      setPhone(values.phone)
    } catch (e) {
      phoneForm.setError('root', { message: (e as Error).message })
    }
  }

  async function onReset(values: ResetPasswordFormValues) {
    try {
      await resetPassword({ phone, ...values })
      navigate('/login', { state: { notice: 'Password reset. Sign in with your new password.' } })
    } catch (e) {
      resetForm.setError('root', { message: (e as Error).message })
    }
  }

  async function onResend() {
    try {
      await forgotPassword(phone)
      // The API sends at most one code a minute and answers the same either way.
      setNotice('If a minute has passed since the last code, a new one is on its way.')
    } catch (e) {
      resetForm.setError('root', { message: (e as Error).message })
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md p-10 bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col gap-8">
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <Logo showText={false} size="lg" />
          <h1 className="text-slate-900 text-3xl font-medium tracking-tight">{phone ? 'Set a new password' : 'Forgot your password?'}</h1>
          <p className="text-slate-500 text-sm">
            {phone ? `If ${phone} has an account, we sent it a 6-digit code. Enter it with your new password.` : 'Enter your phone number and we will text you a code to reset it.'}
          </p>
        </div>

        {!phone ? (
          <form onSubmit={phoneForm.handleSubmit(onRequest)} className="w-full flex flex-col gap-5">
            <TextField control={phoneForm.control} name="phone" label="Phone Number" type="tel" placeholder="07XXXXXXXX" />
            <RootError message={phoneForm.formState.errors.root?.message} />
            <SubmitButton disabled={phoneForm.formState.isSubmitting}>Send code</SubmitButton>
          </form>
        ) : (
          <form onSubmit={resetForm.handleSubmit(onReset)} className="w-full flex flex-col gap-5">
            <TextField control={resetForm.control} name="otp" label="Reset Code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="123456" />
            <TextField control={resetForm.control} name="newPassword" label="New Password" type="password" autoComplete="new-password" placeholder="••••••••••••" />
            <RootError message={resetForm.formState.errors.root?.message} />
            {notice && (
              <p role="status" className="text-green-700 text-sm">
                {notice}
              </p>
            )}
            <SubmitButton disabled={resetForm.formState.isSubmitting}>Reset password</SubmitButton>
            <button type="button" onClick={() => void onResend()} className="text-blue-600 text-sm font-medium hover:underline">
              Resend code
            </button>
          </form>
        )}

        <p className="w-full pt-2 border-t border-neutral-200 text-slate-600 text-sm text-center">
          Remembered it?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
