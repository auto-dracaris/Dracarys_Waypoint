import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App'
import { UserProvider } from './features/auth/user-context'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter><UserProvider><App /></UserProvider></BrowserRouter>
  </StrictMode>,
)
