import { useForm, Controller } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@/features/store-manager/schema'
import { Field, FieldLabel, FieldError } from '@/components/ui/shadcn/field'
import { Input } from '@/components/ui/shadcn/input'
import { Checkbox } from '@/components/ui/shadcn/checkbox'
import { Button } from '@/components/ui/shadcn/button'
import { ArrowRight } from 'lucide-react'
import type { LoginFormValues } from '@/features/store-manager/types'
import { Logo } from '@/features/store-manager/components/logo'
import { useUser } from '@/features/auth/user-context'

export function LoginForm() {
  const { login } = useUser()
  // A password reset lands here with a confirmation to show.
  const notice = (useLocation().state as { notice?: string } | null)?.notice
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: '',
      password: '',
      rememberMe: false,
    },
  })

  async function onSubmit({ phone, password, rememberMe }: LoginFormValues) {
    try {
      // The login page redirects to the user's portal once the session is set.
      await login({ phone, password }, rememberMe)
    } catch (e) {
      form.setError('root', { message: (e as Error).message })
    }
  }

  return (
    <div className="w-full max-w-md p-10 bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-start items-start gap-8">
      {/* Header & Logo Section */}
      <div className="w-full flex flex-col justify-start items-center gap-4">
        <Logo showText={false} size="lg" />

        <div className="w-full flex flex-col justify-start items-center gap-2 text-center">
          <h1 className="text-slate-900 text-3xl font-medium tracking-tight">Sign in to WayPoint</h1>
          <p className="text-slate-500 text-sm font-normal">Enter your phone number and password</p>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full flex flex-col gap-5">
        {notice && (
          <p role="status" className="text-green-700 text-sm">
            {notice}
          </p>
        )}
        {/* Phone Field */}
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="w-full space-y-1">
              <FieldLabel className="text-slate-600 text-sm font-medium flex gap-1">
                Phone Number <span className="text-red-500">*</span>
              </FieldLabel>
              <Input {...field} type="tel" aria-invalid={fieldState.invalid} placeholder="07XXXXXXXX" className="h-11 px-3 bg-neutral-50 rounded-lg border-neutral-300 text-slate-900 text-sm" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Password Field */}
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="w-full space-y-1">
              <FieldLabel className="text-slate-600 text-sm font-medium flex gap-1">
                Password <span className="text-red-500">*</span>
              </FieldLabel>
              <Input {...field} type="password" aria-invalid={fieldState.invalid} placeholder="••••••••••••" className="h-11 px-3 bg-neutral-50 rounded-lg border-neutral-300 text-slate-900 text-sm" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Remember Me & Forgot Password Row */}
        <div className="w-full flex justify-between items-center pt-1">
          <Controller
            name="rememberMe"
            control={form.control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400 data-[state=checked]:text-stone-900"
                />
                <label htmlFor="remember-me" className="text-slate-600 text-sm font-medium cursor-pointer">
                  Remember me
                </label>
              </div>
            )}
          />
          <Link to="/forgot-password" className="text-blue-600 text-sm font-medium hover:underline">
            Forgot password?
          </Link>
        </div>

        {form.formState.errors.root && (
          <p role="alert" className="text-red-600 text-sm">
            {form.formState.errors.root.message}
          </p>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full h-10 bg-yellow-400 hover:bg-yellow-500 text-stone-900 font-semibold text-base rounded-sm flex items-center justify-center gap-2 shadow-none"
          >
            Log in <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </form>

      {/* Footer Disclaimer */}
      <div className="w-full flex flex-col items-center gap-4 pt-2 border-t border-neutral-200">
        <p className="text-slate-600 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">
            Create one
          </Link>
        </p>
        <p className="text-neutral-400 text-xs font-normal text-center leading-4">Authorized access only. All activities are monitored and logged.</p>
      </div>
    </div>
  )
}
