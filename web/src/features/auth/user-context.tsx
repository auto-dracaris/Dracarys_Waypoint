import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler } from '@/lib/api-client'
import * as authApi from './api'
import type { LoginPayload, Session, User } from './api'

interface UserContextValue {
  user: User | null
  accessToken: string | null
  login: (credentials: LoginPayload, remember: boolean) => Promise<void>
  logout: () => Promise<void>
}

const sessionKey = 'waypoint:session'
const UserContext = createContext<UserContextValue | null>(null)

function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(sessionKey) ?? window.sessionStorage.getItem(sessionKey)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(session: Session | null, remember = false): void {
  try {
    window.localStorage.removeItem(sessionKey)
    window.sessionStorage.removeItem(sessionKey)
    if (session) (remember ? window.localStorage : window.sessionStorage).setItem(sessionKey, JSON.stringify(session))
  } catch { /* The session still lives in memory when browser storage is unavailable. */ }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(loadSession)

  // An expired or revoked token ends the session; RequireRole then shows the login page.
  useEffect(() => {
    setUnauthorizedHandler(() => { saveSession(null); setSession(null) })
    return () => setUnauthorizedHandler(undefined)
  }, [])

  async function login(credentials: LoginPayload, remember: boolean) {
    const next = await authApi.login(credentials)
    if (!authApi.ROLE_HOME[next.user.role]) {
      await authApi.logout(next.accessToken).catch(() => {})
      throw new Error('This account has no web access. Drivers and loaders use the mobile app.')
    }
    saveSession(next, remember)
    setSession(next)
  }

  async function logout() {
    // Best-effort server-side revoke; the local session is cleared regardless.
    if (session) await authApi.logout(session.accessToken).catch(() => {})
    saveSession(null)
    setSession(null)
  }

  return <UserContext.Provider value={{ user: session?.user ?? null, accessToken: session?.accessToken ?? null, login, logout }}>
    {children}
  </UserContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used inside <UserProvider>')
  return context
}
