import HomeOutlined from '@mui/icons-material/HomeOutlined'
import ErrorRounded from '@mui/icons-material/ErrorRounded'
import FormatListBulletedRounded from '@mui/icons-material/FormatListBulletedRounded'
import MoreTimeRounded from '@mui/icons-material/MoreTimeRounded'
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import PeopleOutlineRounded from '@mui/icons-material/PeopleOutlineRounded'

export type SidebarRole = 'Hub' | 'Store Manager'

// Both sidebar sizes use the same links, icons, and route labels.
export const sidebarNavigation = {
  Hub: {
    primary: [
      { label: 'Overview', Icon: HomeOutlined },
      { label: 'Orders', Icon: FormatListBulletedRounded },
      { label: 'Issues', Icon: ErrorRounded },
      { label: 'Planning', Icon: MoreTimeRounded },
      // { label: 'Operations', Icon: BrushOutlined },
    ],
    management: [
      { label: 'Vehicles', Icon: LocalShippingOutlined },
      { label: 'Outlets', Icon: StorefrontOutlined },
      { label: 'Team', Icon: PeopleOutlineRounded },
    ],
  },
  'Store Manager': {
    primary: [
      { label: 'Overview', Icon: HomeOutlined },
      { label: 'Orders', Icon: FormatListBulletedRounded },
      { label: 'Deliveries', Icon: LocalShippingOutlined },
    ],
    management: [],
  },
}
