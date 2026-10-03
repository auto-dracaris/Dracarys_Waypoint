import { Suspense, lazy } from 'react'
import { StyledEngineProvider } from '@mui/material/styles'

const StoreManager = lazy(() => import('../store-manager/App'))
const Hub = lazy(() => import('./hub-entry'))

export function Application() {
  // Load only the selected area's original global theme, including portal styles.
  // Links between areas must load a new document to keep those themes separate.
  const storeManager = /^\/store-manager(?:\/|$)/.test(window.location.pathname)
  return <Suspense fallback={<p role="status">Loading WayPoint…</p>}>
    {storeManager ? <StoreManager /> : <StyledEngineProvider enableCssLayer><Hub /></StyledEngineProvider>}
  </Suspense>
}
