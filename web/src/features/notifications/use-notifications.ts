import { useEffect, useState } from 'react'
import { useUser } from '@/features/auth/user-context'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, type ApiNotification } from './api'

const REFRESH_MS = 60_000

// The signed-in user's notifications, refetched every minute and on `refresh`.
// ponytail: polling, so a new one shows up to a minute late; move to a push channel if that matters.
export function useNotifications() {
  const { accessToken } = useUser()
  const [items, setItems] = useState<ApiNotification[]>([])
  const [attempt, setAttempt] = useState(0)
  const refresh = () => setAttempt((previous) => previous + 1)

  useEffect(() => {
    if (!accessToken) return
    let stale = false
    fetchNotifications(accessToken).then(
      (list) => {
        if (!stale) setItems(list)
      },
      // A failed refresh keeps what is on screen; the next one tries again.
      () => {},
    )
    return () => {
      stale = true
    }
  }, [accessToken, attempt])

  useEffect(() => {
    const timer = setInterval(() => setAttempt((previous) => previous + 1), REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  // One notification, or all of them when no id is given.
  function read(id?: string) {
    if (!accessToken) return
    setItems((previous) => previous.map((item) => (!item.read && (id === undefined || item.id === id) ? { ...item, read: true } : item)))
    // Shown as read straight away; if the server refuses, the refetch puts it back.
    ;(id === undefined ? markAllNotificationsRead(accessToken) : markNotificationRead(accessToken, id)).catch(refresh)
  }

  return { items, unreadCount: items.filter((item) => !item.read).length, read, refresh }
}
