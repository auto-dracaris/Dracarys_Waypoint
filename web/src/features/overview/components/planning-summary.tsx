import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { Button } from '@/components/ui/button'
import { planningTotals as totals } from '../data'

export function PlanningSummary({ date, onDateChange, onNavigate }: { date: string; onDateChange: (date: string) => void; onNavigate: (page: string) => void }) {
  const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
  const metrics = [['Confirmed orders', totals.confirmed], ['Orders allocated', totals.allocated], ['Need a decision', totals.decisions], ['Deferred orders', totals.deferred]] as const
  return (
    <section className="planning-summary" aria-labelledby="planning-title">
      <div className="planning-header"><h2 id="planning-title" className="type-display-md-medium">Delivery planning</h2><label className="date-picker type-text-sm-medium"><CalendarMonthOutlined fontSize="inherit" /><span>{dateLabel}</span><ExpandMoreRounded fontSize="inherit" /><input type="date" value={date} aria-label="Planning date" onChange={event => { if (event.target.value) onDateChange(event.target.value) }} /></label></div>
      <div className="intake-status"><div className="flex flex-wrap items-center gap-wp-space-lg"><span className="intake-dot" /><strong className="type-text-sm-semibold">Order intake closed</strong><span className="intake-divider" /><span className="text-wp-text-secondary type-text-sm-regular">Cutoff · 4:00 PM</span></div><span className="text-wp-text-secondary type-text-xs-regular">Saved just now</span></div>
      <dl className="planning-metrics">{metrics.map(([label, value]) => <div key={label} className={label === 'Need a decision' ? 'metric-decision' : ''}><dt className="text-wp-text-secondary type-text-sm-regular">{label}</dt><dd className="type-display-xl-semibold">{value}</dd></div>)}</dl>
      <div className="allocation-section"><div className="allocation-label"><h3 className="type-text-sm-bold">Allocation progress</h3><span className="text-wp-text-secondary type-text-xs-regular">{totals.allocated} of {totals.confirmed} orders allocated</span></div><div className="allocation-track" role="progressbar" aria-label="Orders allocated" aria-valuemin={0} aria-valuemax={totals.confirmed} aria-valuenow={totals.allocated}><div style={{ width: `${totals.allocated / totals.confirmed * 100}%` }} /></div></div>
      <div className="decision-section"><div className="decision-card"><div className="decision-heading"><WarningAmberRounded fontSize="inherit" /><div><h3 className="type-text-sm-bold">12 orders need a decision</h3><p className="mt-wp-space-xs text-wp-text-secondary type-text-xs-regular">Allocate or defer the remaining orders before publishing.</p></div></div><button className="decision-row" onClick={() => onNavigate('Review orders DEMO-106 · DEMO-107')}><strong className="type-text-sm-bold">DEMO-106 · DEMO-107</strong><span className="decision-description type-text-sm-regular">Awaiting vehicle allocation</span><span className="review-link type-text-sm-medium">Review orders <ArrowForwardRounded fontSize="inherit" /></span></button><button className="decision-row" onClick={() => onNavigate('Review order DEMO-108')}><strong className="type-text-sm-bold">DEMO-108</strong><div className="decision-description flex flex-wrap items-center gap-wp-space-lg"><span className="type-text-sm-regular">Refrigerated van required</span><span className="deferral-badge type-text-xs-medium">Deferred on 3 previous runs</span></div><span className="review-link type-text-sm-medium">Review orders <ArrowForwardRounded fontSize="inherit" /></span></button></div></div>
      <footer className="planning-footer"><div className="flex items-center gap-wp-space-lg"><span className="plan-icon"><DescriptionOutlined fontSize="inherit" /></span><strong className="type-text-sm-bold">Plan not published</strong></div><Button onClick={() => onNavigate('Delivery planning')}>Continue the Planning <ArrowForwardRounded fontSize="inherit" /></Button></footer>
    </section>
  )
}
