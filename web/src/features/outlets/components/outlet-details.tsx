import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'
import { Button } from '@/components/ui/button'
import { DetailPanel } from '@/components/ui/detail-panel'
import type { DetailPanelState } from '@/components/ui/use-detail-panel'
import texture from '@/assets/overview/texture.png'
import store from '@/assets/outlets/store.png'
import type { Outlet } from '../data'

export function OutletDetails({ panel, outlet, onEdit, onAvailability, onNavigate }: { panel: DetailPanelState; outlet: Outlet; onEdit: () => void; onAvailability: () => void; onNavigate: (page: string) => void }) {
  return <DetailPanel panel={panel} label={`Details for ${outlet.id}`} className="outlet-details">
    <header className="fleet-vehicle-banner outlet-banner"><img className="outlet-texture" src={texture} alt="" /><div className="outlet-store-crop"><img src={store} alt="" /></div><div className="fleet-vehicle-title"><h2 className="type-display-md-semibold">{outlet.id}</h2><p className="type-text-md-medium text-wp-text-secondary">{outlet.brand} outlet</p></div></header>
    <div className="outlet-details-body">
      <section className="outlet-requirements" aria-labelledby="outlet-requirements-title"><div><h3 id="outlet-requirements-title" className="type-text-md-semibold">Delivery requirements</h3><p className="type-text-sm-regular text-wp-text-tertiary">Vehicle assignments must meet these requirements.</p></div>
        <dl className="outlet-requirement-rows type-text-sm-regular">{[['Assigned depot', outlet.depot], ['District', outlet.district], ['Receiving window', `${outlet.windowStart} – ${outlet.windowEnd}`], ['Vehicle access', outlet.access === 'Van only' ? 'Vans only' : outlet.access], ['Delivery point', outlet.deliveryPoint]].map(([label, value]) => <div key={label}><dt className="text-wp-text-secondary">{label}</dt><dd className="type-text-sm-semibold">{value}</dd></div>)}</dl>
        <div className="outlet-edit-action"><Button variant="primary" onClick={onEdit}>Edit requirements</Button></div>
      </section>
      <section className="outlet-next-delivery"><h3 className="type-text-md-semibold">Next delivery</h3><div className="outlet-schedule type-text-sm-regular"><span><CalendarTodayOutlined fontSize="inherit" />Tue, 29 Sep</span><span className="text-wp-text-secondary">2 confirmed orders</span></div><div className="outlet-order-actions"><div className="outlet-tags"><span className="type-text-xs-medium">Ambient</span><span className="type-text-xs-medium">Chilled</span></div><button className="outlet-orders-link type-text-sm-semibold" onClick={() => onNavigate(`Orders for ${outlet.id}`)}>View orders<ArrowForwardRounded fontSize="inherit" /></button></div></section>
      <section className="outlet-activity"><h3 className="type-text-md-semibold">Recent activity</h3><div className="outlet-activity-item"><span className="outlet-activity-icon outlet-activity-icon--success"><CheckCircleRounded fontSize="inherit" /></span><p className="type-text-sm-regular text-wp-text-secondary">26 Sep · Receipt confirmed</p></div><div className="outlet-activity-item"><span className="outlet-activity-icon outlet-activity-icon--warning"><WarningRounded fontSize="inherit" /></span><div><p className="type-text-sm-regular text-wp-text-secondary">25 Sep · Delivery deferred</p><p className="type-text-xs-regular text-wp-text-tertiary">No suitable vehicle available</p></div></div></section>
    </div>
    <footer className="fleet-details-footer"><Button className="w-full" onClick={onAvailability}>Update availability</Button></footer>
  </DetailPanel>
}
