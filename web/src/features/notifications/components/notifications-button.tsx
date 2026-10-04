import { useOutletContext } from 'react-router-dom'
import NotificationsRounded from '@mui/icons-material/NotificationsRounded'
import { Button } from '@/components/ui/button'
import type { HubController } from '@/features/hub/use-hub-controller'

// The page header's way into the notifications panel, with the unread count.
export function NotificationsButton() {
  const { unreadNotifications: unread, navigate } = useOutletContext<HubController>()
  return (
    <Button variant={unread ? 'danger' : 'outline'} size="md" className="decision-button" onClick={() => navigate('Notifications')}>
      <NotificationsRounded fontSize="inherit" />
      {unread ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'Notifications'}
    </Button>
  )
}
