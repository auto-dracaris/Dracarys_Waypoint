import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import { reviewedPlan } from '../data'

export function PlanReviewSidebar({ plan, published = false }: { plan: typeof reviewedPlan | null; published?: boolean }) {
  return <aside className="plan-review-sidebar" aria-label="Plan validation and deferred orders">
    <section className={`plan-review-card plan-validation ${plan ? 'plan-validation--passed' : 'plan-validation--pending'}`} aria-labelledby="plan-validation-title">
      <h2 id="plan-validation-title" className="type-text-sm-bold">{plan ? <CheckCircleOutlineRounded fontSize="inherit" /> : <WarningAmberRounded fontSize="inherit" />}{plan ? 'Validation Passed' : 'Validation pending'}</h2>
      <p className="type-text-xs-regular">{plan ? `All ${plan.routes.length} routes checked against ${plan.constraints.length} active constraints. No violations found. ${published ? 'The published plan is available to view.' : 'Publish plan is enabled.'}` : 'No reviewed plan is available for this date. Review a delivery plan before publishing.'}</p>
      {plan && <ul className="plan-constraints">{plan.constraints.map(constraint => <li key={constraint} className="type-text-xs-medium"><CheckRounded fontSize="inherit" />{constraint}</li>)}</ul>}
    </section>
    <section className="plan-review-card plan-deferred" aria-labelledby="plan-deferred-title"><h2 id="plan-deferred-title" className="type-text-sm-bold">Deferred Orders</h2><p className="type-text-xs-regular text-wp-text-tertiary">{plan ? 'These orders have been removed from the delivery sequence for future allocation.' : 'No deferred orders are available for this date.'}</p>
      {plan && <div className="plan-deferred-list">{plan.deferred.map(order => <article key={order.id} className="plan-deferred-order"><header><h3 className="type-text-sm-bold">{order.id}</h3><span className="plan-badge plan-badge--deferred type-text-xs-medium">Deferred</span></header><p className="type-text-xs-medium text-wp-text-secondary">{order.outlet}</p><p className="type-text-xs-regular text-wp-text-tertiary">Reason: {order.reason}</p><p className="type-text-xs-regular text-wp-text-secondary">Previous deferrals: {order.previousDeferrals}</p></article>)}</div>}
    </section>
  </aside>
}
