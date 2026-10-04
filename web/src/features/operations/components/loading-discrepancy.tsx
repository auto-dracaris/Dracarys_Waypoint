import type { LoadingException } from '../data'

export function LoadingDiscrepancy({ exception }: { exception: LoadingException }) {
  return (
    <section className="loading-card loading-discrepancy" aria-labelledby="loading-discrepancy-title">
      <h2 id="loading-discrepancy-title" className="type-text-lg-medium">
        Discrepancy Details
      </h2>
      <div className="loading-facts">
        <div>
          <h3 className="type-text-xs-medium text-wp-text-secondary">Order ID / Destination</h3>
          <strong className="type-text-sm-bold">{exception.orderId}</strong>
          <p className="type-text-xs-regular text-wp-text-secondary">{exception.destination}</p>
        </div>
        <div>
          <h3 className="type-text-xs-medium text-wp-text-secondary">Required Quantity</h3>
          <strong className="type-text-sm-bold">
            {exception.requiredCases} cases ({exception.requiredWeight} kg)
          </strong>
        </div>
        <div className="loading-shortage">
          <h3 className="type-text-xs-medium">Missing / Damaged</h3>
          <div>
            <strong className="type-text-sm-bold">Missing: {exception.missingCases} cases</strong>
            <p className="type-text-xs-regular">Damaged: {exception.damagedCases} cases (packaging torn)</p>
          </div>
        </div>
      </div>
      <div className="loading-report">
        <h3 className="type-text-xs-semibold text-wp-text-secondary">
          Loader Report ({exception.loader} • {exception.reportedAt})
        </h3>
        <p className="type-text-sm-regular">“{exception.report}”</p>
      </div>
    </section>
  )
}
