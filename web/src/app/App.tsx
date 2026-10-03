import { lazy, Suspense, useLayoutEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { HubLayout } from '@/components/layout/hub-layout'
import { HubPage } from '@/components/layout/hub-page'
import { OverviewPage } from '@/pages/overview-page'
import { VehiclesPage } from '@/pages/vehicles-page'
import { OutletsPage } from '@/pages/outlets-page'
import { TeamPage } from '@/pages/team-page'
import { OrdersPage } from '@/pages/orders-page'
import { FinalPlanReviewPage } from '@/pages/final-plan-review-page'
import { PublishPlanConfirmationPage } from '@/pages/publish-plan-confirmation-page'
import { LoadingExceptionReviewPage } from '@/pages/loading-exception-review-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { RequireRole } from '@/features/auth/require-role'

const LoginPage = lazy(() => import('@/pages/login-page'))
const RegisterPage = lazy(() => import('@/pages/register-page'))
const StoreManagerLayout = lazy(() => import('@/components/layout/store-manager-layout').then((module) => ({ default: module.StoreManagerLayout })))
const DashboardOverviewPage = lazy(() => import('@/pages/store-manager/dashboard-overview').then((module) => ({ default: module.DashboardOverviewPage })))
const StoreOrdersPage = lazy(() => import('@/pages/store-manager/orders').then((module) => ({ default: module.OrdersPage })))
const PlaceOrderPage = lazy(() => import('@/pages/store-manager/place-order').then((module) => ({ default: module.PlaceOrderPage })))
const DeliveriesPage = lazy(() => import('@/pages/store-manager/deliveries').then((module) => ({ default: module.DeliveriesPage })))
const DeliveryTrackingPage = lazy(() => import('@/pages/store-manager/delivery-tracking').then((module) => ({ default: module.DeliveryTrackingPage })))

export default function App() {
  const { pathname } = useLocation()
  const isAuthPage = pathname === '/login' || pathname === '/register'
  // The sign-in screens use the shadcn kit, whose theme is scoped to the store-manager area.
  const area = isAuthPage || /^\/store-manager(?:\/|$)/.test(pathname) ? 'store-manager' : 'hub'
  useLayoutEffect(() => {
    // The document also contains portaled dialogs, selects, and tooltips.
    document.documentElement.dataset.area = area
    if (area === 'store-manager') document.title = `WayPoint — ${isAuthPage ? 'Sign In' : 'Store Manager'}`
  }, [area, isAuthPage])
  return (
    <Suspense fallback={<p role="status">Loading WayPoint…</p>}>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<RequireRole role="dispatcher" />}>
          <Route element={<HubLayout />}>
            <Route index element={<HubPage>{(hub) => <OverviewPage {...hub.pageProps} />}</HubPage>} />
            <Route path="vehicles" element={<HubPage>{(hub) => <VehiclesPage {...hub.pageProps} />}</HubPage>} />
            <Route path="outlets" element={<HubPage>{(hub) => <OutletsPage {...hub.pageProps} />}</HubPage>} />
            <Route path="team" element={<HubPage>{(hub) => <TeamPage {...hub.pageProps} onViewVehicle={(id) => hub.navigate('Vehicles', id)} />}</HubPage>} />
            <Route path="orders" element={<HubPage>{(hub) => <OrdersPage {...hub.pageProps} />}</HubPage>} />
            <Route path="planning" element={<HubPage>{(hub) => <FinalPlanReviewPage {...hub.pageProps} />}</HubPage>} />
            <Route
              path="planning/published"
              element={<HubPage>{(hub) => hub.publication && <PublishPlanConfirmationPage {...hub.pageProps} publication={hub.publication} onResend={hub.resend} />}</HubPage>}
            />
            <Route
              path="operations"
              element={<HubPage>{(hub) => <LoadingExceptionReviewPage key={hub.loadingException.id} {...hub.pageProps} exception={hub.loadingException} onConfirm={hub.confirmLoading} />}</HubPage>}
            />
            <Route
              path="operations/loading-exception"
              element={<HubPage>{(hub) => <LoadingExceptionReviewPage key={hub.loadingException.id} {...hub.pageProps} exception={hub.loadingException} onConfirm={hub.confirmLoading} />}</HubPage>}
            />
          </Route>
        </Route>
        <Route element={<RequireRole role="store_manager" />}>
          <Route path="store-manager" element={<StoreManagerLayout />}>
            <Route index element={<DashboardOverviewPage />} />
            <Route path="orders" element={<StoreOrdersPage />} />
            <Route path="orders/create" element={<PlaceOrderPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="delivery/:id" element={<DeliveryTrackingPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
