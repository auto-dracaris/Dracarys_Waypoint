import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'
import { Button } from '@/components/ui/button'
import { DetailPanel } from '@/components/ui/detail-panel'
import type { DetailPanelState } from '@/components/ui/use-detail-panel'
import texture from '@/assets/overview/texture.png'
import store from '@/assets/outlets/store.png'
import type { Outlet, OutletOverview } from '../data'

const formatDate = (value: string, options: Intl.DateTimeFormatOptions) => new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-GB', options)

export function OutletDetails({
  panel,
  outlet,
  overview,
  overviewError,
  onEdit,
  onAvailability,
  onNavigate,
}: {
  panel: DetailPanelState
  outlet: Outlet
  overview: OutletOverview | null
  overviewError: string
  onEdit: () => void
  onAvailability: () => void
  onNavigate: (page: string) => void
}) {
  return (
    <DetailPanel panel={panel} label={`Details for ${outlet.id}`} className="outlet-details">
      <header className="fleet-vehicle-banner outlet-banner">
        <img className="outlet-texture" src={texture} alt="" />
        <div className="outlet-store-crop">
          <img src={store} alt="" />
        </div>
        <div className="fleet-vehicle-title">
          <h2 className="type-display-md-semibold">{outlet.id}</h2>
          <p className="type-text-md-medium text-wp-text-secondary">{outlet.brand} outlet</p>
        </div>
      </header>
      <div className="outlet-details-body">
        <section className="outlet-requirements" aria-labelledby="outlet-requirements-title">
          <div>
            <h3 id="outlet-requirements-title" className="type-text-md-semibold">
              Delivery requirements
            </h3>
            <p className="type-text-sm-regular text-wp-text-tertiary">Vehicle assignments must meet these requirements.</p>
          </div>
          <dl className="outlet-requirement-rows type-text-sm-regular">
            {[
              ['Assigned depot', outlet.depot],
              ['District', outlet.district],
              ['Delivery window', `${outlet.windowStart} – ${outlet.windowEnd}`],
              ...(outlet.mallWindowStart ? [['Mall access window', `${outlet.mallWindowStart} – ${outlet.mallWindowEnd}`]] : []),
              ['Vehicle access', outlet.access === 'Van only' ? 'Vans only' : outlet.access],
              ['Delivery point', outlet.deliveryPoint],
              ['Availability', outlet.availability],
              ['Contact', outlet.contactPhone],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-wp-text-secondary">{label}</dt>
                <dd className="type-text-sm-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="outlet-edit-action">
            <Button variant="primary" onClick={onEdit}>
              Edit requirements
            </Button>
          </div>
        </section>
        <section className="outlet-next-delivery">
          <h3 className="type-text-md-semibold">Next delivery</h3>
          {overview?.nextDelivery ? (
            <>
              <div className="outlet-schedule type-text-sm-regular">
                <span>
                  <CalendarTodayOutlined fontSize="inherit" />
                  {formatDate(overview.nextDelivery.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span className="text-wp-text-secondary">
                  {overview.nextDelivery.orders} open {overview.nextDelivery.orders === 1 ? 'order' : 'orders'}
                </span>
              </div>
              <div className="outlet-order-actions">
                <div className="outlet-tags">
                  {overview.nextDelivery.temps.map((temp) => (
                    <span key={temp} className="type-text-xs-medium">
                      {temp === 'chilled' ? 'Chilled' : 'Ambient'}
                    </span>
                  ))}
                </div>
                <button className="outlet-orders-link type-text-sm-semibold" onClick={() => onNavigate(`Orders for ${outlet.id}`)}>
                  View orders
                  <ArrowForwardRounded fontSize="inherit" />
                </button>
              </div>
            </>
          ) : (
            <p role={overviewError ? 'alert' : 'status'} className="type-text-sm-regular text-wp-text-tertiary">
              {overviewError || (overview ? 'No upcoming orders.' : 'Loading…')}
            </p>
          )}
        </section>
        <section className="outlet-activity">
          <h3 className="type-text-md-semibold">Recent activity</h3>
          {overview?.recentActivity.length ? (
            overview.recentActivity.map((item, index) => (
              <div className="outlet-activity-item" key={index}>
                <span className={`outlet-activity-icon outlet-activity-icon--${item.type === 'received' ? 'success' : 'warning'}`}>
                  {item.type === 'received' ? <CheckCircleRounded fontSize="inherit" /> : <WarningRounded fontSize="inherit" />}
                </span>
                <div>
                  <p className="type-text-sm-regular text-wp-text-secondary">
                    {formatDate(item.at, { day: 'numeric', month: 'short' })} · {item.type === 'received' ? 'Receipt confirmed' : 'Delivery deferred'}
                  </p>
                  {item.note && <p className="type-text-xs-regular text-wp-text-tertiary">{item.note}</p>}
                </div>
              </div>
            ))
          ) : (
            <p className="type-text-sm-regular text-wp-text-tertiary">{overviewError ? '' : overview ? 'No recent activity.' : 'Loading…'}</p>
          )}
        </section>
      </div>
      <footer className="fleet-details-footer">
        <Button className="w-full" onClick={onAvailability}>
          Update availability
        </Button>
      </footer>
    </DetailPanel>
  )
}
