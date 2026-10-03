import type { FormEvent } from 'react'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm({ onNotice }: { onNotice: (title: string) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Account authentication will be connected when its service is available.
    onNotice('Sign-in service is not connected')
  }

  return <form className="login-form" onSubmit={submit}>
    <div className="login-fields">
      <div className="login-field">
        <label htmlFor="login-email" className="type-text-sm-medium">Email Address <span aria-hidden="true">*</span></label>
        <Input id="login-email" name="email" type="email" required autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="admin@deliveryplatform.com" />
      </div>
      <div className="login-field">
        <label htmlFor="login-password" className="type-text-sm-medium">Password <span aria-hidden="true">*</span></label>
        <Input id="login-password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••••••" />
      </div>
    </div>
    <div className="login-options type-text-sm-medium">
      <label className="login-remember"><input type="checkbox" name="remember" defaultChecked />Remember me</label>
      <button type="button" className="login-recovery" onClick={() => onNotice('Password recovery is not connected')}>Forgot password?</button>
    </div>
    <Button type="submit" variant="primary" size="md" className="login-submit" trailingIcon={<ArrowForwardRounded fontSize="inherit" />}>Log in</Button>
  </form>
}
