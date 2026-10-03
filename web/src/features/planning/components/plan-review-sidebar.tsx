import { StatusBadge } from '@/components/ui/status-badge'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import { planConstraints, type DeliveryPlan } from '../data'

// `plan` is null while it loads; a plan in state 'none' has not been run yet.
export function PlanReviewSidebar({ plan }: { plan: DeliveryPlan | null }) {
  const planned = !!plan && plan.state !== 'none'
  const passed = planned && plan.issues.length === 0
  return (
    <aside className="plan-review-sidebar" aria-label="Plan validation and deferred orders">
      <section className={`plan-review-card plan-validation ${passed ? 'plan-validation--passed' : 'plan-validation--pending'}`} aria-labelledby="plan-validation-title">
        <h2 id="plan-validation-title" className="type-text-sm-bold">
          {passed ? <CheckCircleOutlineRounded fontSize="inherit" /> : <WarningAmberRounded fontSize="inherit" />}
          {!planned ? 'Validation pending' : passed ? 'Validation Passed' : `${plan.issues.length} ${plan.issues.length === 1 ? 'issue' : 'issues'} to resolve`}
        </h2>
        <p className="type-text-xs-regular">
          {!planned
            ? 'Run planning for this day to allocate its orders and check the result.'
            : passed
              ? `All ${plan.routes.length} routes checked against ${planConstraints.length} constraints. No violations found. ${plan.state === 'published' ? 'This plan is published.' : 'Publish plan is enabled.'}`
              : 'The draft no longer fits the orders and vehicles as they stand. Run planning again, then publish.'}
        </p>
        {passed && (
          <ul className="plan-constraints">
            {planConstraints.map((constraint) => (
              <li key={constraint} className="type-text-xs-medium">
                <CheckRounded fontSize="inherit" />
                {constraint}
              </li>
            ))}
          </ul>
        )}
        {planned && !passed && (
          <ul className="plan-constraints">
            {plan.issues.map((issue) => (
              <li key={issue} className="type-text-xs-medium">
                <WarningAmberRounded fontSize="inherit" />
                {issue}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="plan-review-card plan-deferred" aria-labelledby="plan-deferred-title">
        <h2 id="plan-deferred-title" className="type-text-sm-bold">
          Deferred Orders
        </h2>
        <p className="type-text-xs-regular text-wp-text-tertiary">
          {!planned
            ? 'No plan for this day yet.'
            : !plan.deferred.length
              ? 'Every order on this run is on a trip.'
              : plan.state === 'published'
                ? 'These orders were left off this run and moved to the next operating day.'
                : 'These orders are left off this run. They move to the next operating day when the plan is published.'}
        </p>
        {planned && (
          <div className="plan-deferred-list">
            {plan.deferred.map((order) => (
              <article key={order.id} className="plan-deferred-order">
                <header>
                  <h3 className="type-text-sm-bold">{order.id}</h3>
                  <StatusBadge tone="warning">Deferred</StatusBadge>
                </header>
                <p className="type-text-xs-medium text-wp-text-secondary">{order.outlet}</p>
                <p className="type-text-xs-regular text-wp-text-tertiary">
                  Reason: {order.reason}
                  {order.note && ` — ${order.note}`}
                </p>
                <p className="type-text-xs-regular text-wp-text-secondary">
                  Priority score: {order.score} · Previous deferrals: {order.previousDeferrals}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </aside>
  )
}
