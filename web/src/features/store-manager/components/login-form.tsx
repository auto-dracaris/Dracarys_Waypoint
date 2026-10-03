import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/features/store-manager/schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/shadcn/field";
import { Input } from "@/components/ui/shadcn/input";
import { Checkbox } from "@/components/ui/shadcn/checkbox";
import { Button } from "@/components/ui/shadcn/button";
import { ArrowRight } from "lucide-react";
import type { LoginFormValues } from "@/features/store-manager/types";
import { Logo } from "./logo";

export function LoginForm() {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  function onSubmit(data: LoginFormValues) {
    console.log("Login Payload:", data);
    // Handle authentication logic here
  }

  return (
    <div className="w-full max-w-md p-10 bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-start items-start gap-8">
      {/* Header & Logo Section */}
      <div className="w-full flex flex-col justify-start items-center gap-4">
        <Logo showText={false} size="lg" />

        <div className="px-3 py-1 bg-yellow-100 rounded-[100px] inline-flex justify-center items-center">
          <span className="text-yellow-700 text-xs font-semibold">
            Admin Portal
          </span>
        </div>

        <div className="w-full flex flex-col justify-start items-center gap-2 text-center">
          <h1 className="text-slate-900 text-3xl font-medium tracking-tight">
            Sign in to manage
          </h1>
          <p className="text-slate-500 text-sm font-normal">
            Enter your administrator credentials below
          </p>
        </div>
      </div>

      {/* Form Content */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full flex flex-col gap-5"
      >
        {/* Email Field */}
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className="w-full space-y-1"
            >
              <FieldLabel className="text-slate-600 text-sm font-medium flex gap-1">
                Email Address <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                {...field}
                type="email"
                aria-invalid={fieldState.invalid}
                placeholder="admin@deliveryplatform.com"
                className="h-11 px-3 bg-neutral-50 rounded-lg border-neutral-300 text-slate-900 text-sm"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Password Field */}
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className="w-full space-y-1"
            >
              <FieldLabel className="text-slate-600 text-sm font-medium flex gap-1">
                Password <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                {...field}
                type="password"
                aria-invalid={fieldState.invalid}
                placeholder="••••••••••••"
                className="h-11 px-3 bg-neutral-50 rounded-lg border-neutral-300 text-slate-900 text-sm"
              />
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
                <label
                  htmlFor="remember-me"
                  className="text-slate-600 text-sm font-medium cursor-pointer"
                >
                  Remember me
                </label>
              </div>
            )}
          />
          <a
            href="#forgot"
            onClick={(e) => e.preventDefault()}
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-10 bg-yellow-400 hover:bg-yellow-500 text-stone-900 font-semibold text-base rounded-sm flex items-center justify-center gap-2 shadow-none"
          >
            Log in <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </form>

      {/* Footer Disclaimer */}
      <div className="w-full flex flex-col items-center gap-4 pt-2 border-t border-neutral-200">
        <p className="text-neutral-400 text-xs font-normal text-center leading-4">
          Authorized access only. All activities are monitored and logged.
        </p>
      </div>
    </div>
  );
}
