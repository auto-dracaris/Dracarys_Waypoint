import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
export function Icon({ name }: { name: string }) { return <span className="icon" aria-hidden="true">{name}</span> }
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return <header className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="header-actions">{children}</div></header>
}
export function ActionLink({ to, children, primary = false }: { to: string; children: ReactNode; primary?: boolean }) {
  return <Link className={`button ${primary ? 'primary' : ''}`} to={to}>{children}</Link>
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span> }
export function DatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  return <label className="date-picker"><Icon name="calendar_today" /><input aria-label="Planning date" type="date" value={value} onChange={e => e.target.value && onChange(e.target.value)} /></label>
}
