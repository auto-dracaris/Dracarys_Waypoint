import { useEffect, useState } from 'react'
import { OverviewPage } from '@/pages/overview-page'
import { VehiclesPage } from '@/pages/vehicles-page'
import { OutletsPage } from '@/pages/outlets-page'
import { TeamPage } from '@/pages/team-page'
import { OrdersPage } from '@/pages/orders-page'
import { FinalPlanReviewPage } from '@/pages/final-plan-review-page'
import { PublishPlanConfirmationPage } from '@/pages/publish-plan-confirmation-page'
import { LoadingExceptionReviewPage } from '@/pages/loading-exception-review-page'
import { initialLoadingException, confirmLoadingDecision, type LoadingAction } from '@/features/operations/data'
import { createPublishedPlan, resendNotification, type PublishedPlan } from '@/features/planning/publication'
import { reviewedPlan } from '@/features/planning/data'
import { Sidebar } from '@/components/layout/sidebar'
import { StageNotice } from '@/components/ui/stage-notice'
import { NotificationsPanel } from '@/features/notifications/components/notifications-panel'
import { initialNotifications, markNotificationsRead, type NotificationItem } from '@/features/notifications/data'
import '@/styles/overview.css'

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [navigationOpen, setNavigationOpen] = useState(false)
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
  const [publication, setPublication] = useState<PublishedPlan | null>(() => isPublished ? createPublishedPlan(reviewedPlan.date).publication : null)
  useEffect(() => {
    const onPopState = () => { setPath(window.location.pathname); setNavigationOpen(false); setNotice(null); setNotificationsOpen(false) }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  useEffect(() => { document.title = `WayPoint — ${isVehicles ? 'Vehicles' : isOutlets ? 'Outlets' : isTeam ? 'Team' : isOrders ? 'Confirmed Orders' : isPlanning ? 'Final Plan Review' : isPublished ? 'Plan Published' : isOperations ? 'Loading Exception Review' : 'Delivery Overview'}` }, [isVehicles, isOutlets, isTeam, isOrders, isPlanning, isPublished, isOperations])
  function navigate(page: string, recordId?: string) {
    setNavigationOpen(false)
    if (page === 'Order notifications' || page === 'Notifications') { setNotice(null); setNotificationsOpen(true); return }
    setNotificationsOpen(false)
    const routes: Record<string, string> = { Overview: '/', Home: '/', Dashboard: '/', Vehicles: '/vehicles', Outlets: '/outlets', Team: '/team', Orders: '/orders', Planning: '/planning', 'Delivery planning': '/planning', 'Publish plan confirmation': '/planning/published', Operations: '/operations/loading-exception', 'Loading exception review': '/operations/loading-exception' }
    const route = routes[page]
    const queryKey = page === 'Vehicles' ? 'vehicle' : page === 'Orders' ? 'order' : null
    const target = route && queryKey && recordId ? `${route}?${queryKey}=${encodeURIComponent(recordId)}` : route
    if (target === undefined) { setNotice(page); return }
    if (target !== `${window.location.pathname}${window.location.search}`) window.history.pushState(null, '', target)
    setPath(target.split('?')[0])
    // Orders can already be mounted beneath the notifications panel.
    if (page === 'Orders') window.dispatchEvent(new Event('waypoint:order-selection'))
    setNotice(null)
    window.scrollTo(0, 0)
  }
  function publish(date: string) {
    const result = createPublishedPlan(date)
    if (result.error) { setNotice(result.error); return }
    setPublication(previous => previous ?? result.publication)
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
  function readNotifications(id?: string) { setNotifications(previous => markNotificationsRead(previous, id)) }
  function openNotification(item: NotificationItem) {
    readNotifications(item.id)
    navigate(item.target.page, item.target.orderId)
  }
  const pageProps = { onNavigate: navigate, onOpenNavigation: () => setNavigationOpen(true), navigationOpen }
  return <div className="overview-shell">
    <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} onNavigate={navigate} activePage={isVehicles ? 'Vehicles' : isOutlets ? 'Outlets' : isTeam ? 'Team' : isOrders ? 'Orders' : isPlanning || isPublished ? 'Planning' : isOperations ? 'Operations' : 'Overview'} />
    <main className="overview-main">{isVehicles ? <VehiclesPage {...pageProps} /> : isOutlets ? <OutletsPage {...pageProps} /> : isTeam ? <TeamPage {...pageProps} onViewVehicle={vehicleId => navigate('Vehicles', vehicleId)} /> : isOrders ? <OrdersPage {...pageProps} /> : isPlanning ? <FinalPlanReviewPage {...pageProps} onPublish={publish} published={!!publication} /> : isPublished && publication ? <PublishPlanConfirmationPage {...pageProps} publication={publication} onResend={resend} /> : isOperations ? <LoadingExceptionReviewPage key={loadingException.id} {...pageProps} exception={loadingException} onConfirm={confirmLoading} /> : <OverviewPage {...pageProps} />}</main>
    <StageNotice title={notice} onClose={() => setNotice(null)} returnLabel={isPlanning || isPublished ? 'Back to plan' : isOperations ? 'Back to loading review' : undefined} />
    {notificationsOpen && <NotificationsPanel items={notifications} onRead={readNotifications} onAction={openNotification} onClose={() => setNotificationsOpen(false)} />}
  </div>;
}

export default App;
