import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DispatcherLayout } from './layouts/DispatcherLayout'
import { OverviewPage } from './features/overview/OverviewPage'
import { NotificationsPage } from './features/overview/NotificationsPage'
import { OverviewProvider } from './features/overview/OverviewProvider'
import './App.css'
export default function App() {
  return <BrowserRouter><OverviewProvider><Routes><Route element={<DispatcherLayout />}><Route path="/" element={<OverviewPage />} /><Route path="/trips/:vehicleId" element={<OverviewPage />} /><Route path="/notifications" element={<NotificationsPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes></OverviewProvider></BrowserRouter>
}
