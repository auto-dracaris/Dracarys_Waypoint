import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { initialLoadingException, confirmLoadingDecision, type LoadingAction } from '@/features/operations/data'
import { createPublishedPlan, resendNotification, type PublishedPlan } from '@/features/planning/publication'
import { reviewedPlan } from '@/features/planning/data'
import { initialNotifications, markNotificationsRead, type NotificationItem } from '@/features/notifications/data'
import { loadSidebarCollapsed, saveSidebarCollapsed } from '@/lib/sidebar-preferences'
import { useUser } from '@/features/auth/user-context'

export function useHubController() {
  const location = useLocation()
  const path = location.pathname
  const navigateTo = useNavigate()
  const { logout } = useUser()
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(loadSidebarCollapsed)
  const [notice, setNotice] = useState<string | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const isVehicles = path === '/vehicles'
  const isOutlets = path === '/outlets'
  const isTeam = path === '/team'
  const isOrders = path === '/orders'
  const isPlanning = path === '/planning'
  const isPublished = path === '/planning/published'
  const isOperations = path === '/operations' || path === '/operations/loading-exception'
  const [loadingException, setLoadingException] = useState(initialLoadingException)
  const [publication, setPublication] = useState<PublishedPlan | null>(() => (isPublished ? createPublishedPlan(reviewedPlan.date).publication : null))
  useEffect(() => {
    const onPopState = () => {
      setNavigationOpen(false)
      setNotice(null)
      setNotificationsOpen(false)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  useEffect(() => {
    document.title = `WayPoint — ${isVehicles ? 'Vehicles' : isOutlets ? 'Outlets' : isTeam ? 'Team' : isOrders ? 'Confirmed Orders' : isPlanning ? 'Final Plan Review' : isPublished ? 'Plan Published' : isOperations ? 'Loading Exception Review' : 'Delivery Overview'}`
  }, [isVehicles, isOutlets, isTeam, isOrders, isPlanning, isPublished, isOperations])
  useEffect(() => {
    saveSidebarCollapsed(sidebarCollapsed)
  }, [sidebarCollapsed])
  function navigate(page: string, recordId?: string) {
    setNavigationOpen(false)
    // RequireRole sends the signed-out user to /login.
    if (page === 'Log out') {
      void logout()
      return
    }
    if (page === 'Order notifications' || page === 'Notifications') {
      setNotice(null)
      setNotificationsOpen(true)
      return
    }
    setNotificationsOpen(false)
    const routes: Record<string, string> = {
      Overview: '/',
      Home: '/',
      Dashboard: '/',
      Vehicles: '/vehicles',
      Outlets: '/outlets',
      Team: '/team',
      Orders: '/orders',
      Planning: '/planning',
      'Delivery planning': '/planning',
      'Publish plan confirmation': '/planning/published',
      Operations: '/operations/loading-exception',
      'Loading exception review': '/operations/loading-exception',
    }
    const route = routes[page]
    const queryKey = page === 'Vehicles' ? 'vehicle' : page === 'Orders' ? 'order' : null
    const target = route && queryKey && recordId ? `${route}?${queryKey}=${encodeURIComponent(recordId)}` : route
    if (target === undefined) {
      setNotice(page)
      return
    }
    if (target !== `${location.pathname}${location.search}`) navigateTo(target)
    // Orders can already be mounted beneath the notifications panel.
    if (page === 'Orders') window.dispatchEvent(new Event('waypoint:order-selection'))
    setNotice(null)
    window.scrollTo(0, 0)
  }
  function publish(date: string) {
    const result = createPublishedPlan(date)
    if (result.error) {
      setNotice(result.error)
      return
    }
    setPublication((previous) => previous ?? result.publication)
    navigate('Publish plan confirmation')
  }
  function resend(staffId: string) {
    if (!publication) return 'No published plan is available.'
    const result = resendNotification(publication, staffId)
    if (!result.error) setPublication(result.publication)
    return result.error
  }
  function confirmLoading(action: LoadingAction, notes: string) {
    const result = confirmLoadingDecision(loadingException, action, notes, new Date().toISOString())
    if (!result.error) setLoadingException(result.exception)
    return result.error
  }
  function readNotifications(id?: string) {
    setNotifications((previous) => markNotificationsRead(previous, id))
  }
  function openNotification(item: NotificationItem) {
    readNotifications(item.id)
    navigate(item.target.page, item.target.orderId)
  }
  const pageProps = { onNavigate: navigate, onOpenNavigation: () => setNavigationOpen(true), navigationOpen }
  return {
    pageProps,
    navigate,
    notice,
    setNotice,
    navigationOpen,
    setNavigationOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    notificationsOpen,
    setNotificationsOpen,
    notifications,
    readNotifications,
    openNotification,
    publication,
    publish,
    resend,
    loadingException,
    confirmLoading,
    isVehicles,
    isOutlets,
    isTeam,
    isOrders,
    isPlanning,
    isPublished,
    isOperations,
  }
}

export type HubController = ReturnType<typeof useHubController>
