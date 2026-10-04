import { useEffect, useRef, useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { NotificationCard } from './notification-card'
import { filterNotifications, notificationFilters, type NotificationFilter, type NotificationItem } from '../data'
import '@/styles/notifications.css'

export function NotificationsPanel({
  items,
  onRead,
  onAction,
  onClose,
}: {
  items: NotificationItem[]
  onRead: (id?: string) => void
  onAction: (item: NotificationItem) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const restoreFocus = useRef(true)
  const [filter, setFilter] = useState<NotificationFilter>('All')
  const visible = filterNotifications(items, filter)
  const unreadCount = items.filter((item) => !item.read).length
  useEffect(() => {
    const element = dialog.current!
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      requestAnimationFrame(() => {
        if (restoreFocus.current && trigger?.isConnected && !document.querySelector('dialog[open]')) trigger.focus()
      })
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="notifications-panel"
      aria-labelledby="notifications-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation()
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
    >
      <header className="notifications-header">
        <h2 id="notifications-title" className="type-text-sm-medium">
          Notification
        </h2>
        <div className="notifications-header-actions">
          <button type="button" className="notifications-mark-all type-text-sm-semibold" disabled={unreadCount === 0} onClick={() => onRead()}>
            Mark All Read
          </button>
          <button type="button" autoFocus className="notifications-close" aria-label="Close notifications" onClick={onClose}>
            <CloseRounded fontSize="inherit" />
          </button>
        </div>
      </header>
      <div className="notifications-filter-wrap">
        <div className="route-filters notifications-filters" role="group" aria-label="Filter notifications">
          {notificationFilters.map((label) => (
            <button
              type="button"
              key={label}
              aria-pressed={filter === label}
              className={filter === label ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'}
              onClick={() => setFilter(label)}
            >
              {label}
              <span className="text-wp-text-quaternary">{filterNotifications(items, label).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="notifications-list">
        {visible.length ? (
          visible.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onRead={onRead}
              onAction={(notification) => {
                restoreFocus.current = false
                onAction(notification)
              }}
            />
          ))
        ) : (
          <p className="notifications-empty type-text-sm-regular text-wp-text-tertiary">No {filter.toLowerCase()} notifications.</p>
        )}
      </div>
      <p className="sr-only" role="status">
        {unreadCount ? `${unreadCount} unread notifications.` : 'All notifications marked as read.'}
      </p>
    </dialog>
  )
}
