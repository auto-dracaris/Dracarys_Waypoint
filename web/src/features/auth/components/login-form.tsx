import type { FormEvent } from 'react'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { Button } from '@/components/ui/button'

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
        <input id="login-email" name="email" type="email" required autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="admin@deliveryplatform.com" className="type-text-sm-regular" />
      </div>
      <div className="login-field">
        <label htmlFor="login-password" className="type-text-sm-medium">Password <span aria-hidden="true">*</span></label>
        <input id="login-password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••••••" className="type-text-sm-regular" />
      </div>
    </div>
    <div className="login-options type-text-sm-medium">
      <label className="login-remember"><input type="checkbox" name="remember" defaultChecked />Remember me</label>
      <button type="button" className="login-recovery" onClick={() => onNotice('Password recovery is not connected')}>Forgot password?</button>
    </div>
    <Button type="submit" variant="primary" className="login-submit"><span className="type-text-md-semibold">Log in</span><ArrowForwardRounded fontSize="inherit" /></Button>
  </form>
}
