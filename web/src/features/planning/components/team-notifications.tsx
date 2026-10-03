import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import type { TeamNotification } from '../publication'

export function TeamNotifications({ notifications, acknowledgementsOnly, onShowAll, onResend }: {
  notifications: TeamNotification[]; acknowledgementsOnly: boolean; onShowAll: () => void; onResend: (id: string) => void;
}) {
  const visible = acknowledgementsOnly ? notifications.filter(item => item.status === 'Acknowledged') : notifications
  return <section className="publication-team" aria-labelledby="team-notifications-title"><header><h2 id="team-notifications-title" tabIndex={-1} className="type-text-lg-medium">{acknowledgementsOnly ? 'Team Acknowledgements' : 'Team Notifications'}</h2>{acknowledgementsOnly && <Button onClick={onShowAll}>Show all notifications</Button>}</header>
    <div className="publication-team-scroll" role="region" aria-label="Team notification statuses" tabIndex={0}><table className="publication-team-table type-text-xs-regular"><caption className="sr-only">Staff assignments and notification delivery or acknowledgement statuses</caption><colgroup><col /><col /><col /><col /></colgroup><thead><tr>{['Staff member', 'Role', 'Assignment', 'Status'].map(label => <th key={label} scope="col" className="type-text-xs-semibold">{label}</th>)}</tr></thead><tbody>{visible.map(item => <tr key={item.id}><th scope="row" className="type-text-sm-bold">{item.name}</th><td className="text-wp-text-secondary">{item.role}</td><td className="type-text-xs-medium">{item.assignment}</td><td><div className="publication-notification-status"><StatusBadge tone={item.status === 'Acknowledged' ? 'success' : item.status === 'Delivered' ? 'info' : 'warning'}>{item.status}</StatusBadge>{item.status === 'Sent' && <><span className="text-wp-text-tertiary">{item.sentLabel}</span><button type="button" className="publication-resend type-text-xs-semibold" aria-label={`Resend notification to ${item.name}`} onClick={() => onResend(item.id)}>Resend</button></>}</div></td></tr>)}</tbody></table></div>
  </section>
}
