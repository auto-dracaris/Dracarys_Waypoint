import ErrorRounded from '@mui/icons-material/ErrorRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import InfoRounded from '@mui/icons-material/InfoRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { Button } from '@/components/ui/button'
import type { NotificationItem } from '../data'

export function NotificationCard({ item, onRead, onAction }: { item: NotificationItem; onRead: (id: string) => void; onAction: (item: NotificationItem) => void }) {
  const Icon = { error: ErrorRounded, warning: WarningRounded, success: CheckCircleRounded, info: InfoRounded }[item.kind]
  const unread = (
    <span className="notification-read-slot">
      {!item.read && (
        <button
          type="button"
          className="notification-unread"
          aria-label={`Mark ${item.title} as read`}
          onClick={(event) => {
            onRead(item.id)
            // The read marker disappears; keep keyboard focus inside the card.
            event.currentTarget.closest('article')?.querySelector<HTMLButtonElement>('.notification-primary-action, .notification-action')?.focus({ preventScroll: true })
          }}
        >
          <span />
        </button>
      )}
    </span>
  )
  return (
    <article className={`notification-card notification-card--${item.kind}`} aria-labelledby={`notification-${item.id}`}>
      <div className="notification-card-header">
        <span className="notification-icon">
          <Icon fontSize="inherit" />
        </span>
        <div className="notification-copy">
          <h3 id={`notification-${item.id}`} className="type-text-sm-bold">
            {item.title}
          </h3>
          {item.kind === 'error' ? (
            <p className="notification-error-meta type-text-xs-regular">
              <strong className="type-text-xs-semibold">Action needed</strong>
              <span>· {item.time}</span>
            </p>
          ) : (
            <p className="type-text-sm-regular text-wp-text-secondary">{item.description}</p>
          )}
        </div>
        <div className="notification-meta">
          {item.kind !== 'error' && <span className="type-text-xs-regular text-wp-text-tertiary">{item.time}</span>}
          {unread}
        </div>
      </div>
      {item.kind === 'error' ? (
        <div className="notification-detail-wrap">
          <div className="notification-detail">
            <p className="type-text-sm-regular text-wp-text-secondary">{item.description}</p>
            <div className="notification-detail-actions">
              <dl className="notification-facts">
                {item.facts?.map((fact) => (
                  <div key={fact.label}>
                    <dt className="type-text-xs-medium text-wp-text-tertiary">{fact.label}</dt>
                    <dd className="type-text-xs-semibold">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <Button variant="danger" className="notification-primary-action" onClick={() => onAction(item)}>
                {item.actionLabel}
                <ArrowForwardRounded fontSize="inherit" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" className="notification-action type-text-sm-semibold" onClick={() => onAction(item)}>
          <span>{item.actionLabel}</span>
          <ArrowForwardRounded fontSize="inherit" />
        </button>
      )}
    </article>
  )
}
