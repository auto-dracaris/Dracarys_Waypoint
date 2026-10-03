import type { DeliveryDetails } from '../types'

export const deliveryData: DeliveryDetails = {
  vehicleId: 'VEH021',
  vehicleType: 'Refrigerated van',
  status: 'En route',
  plannedArrival: '07:10',
  receivingWindow: '06:00 – 08:00',
  locationName: 'Fresh · Ja-Ela',
  deliveryTitle: 'Ambient delivery',
  demoId: 'DEMO-105',
  date: 'Tuesday, 29 September',
  quantity: '40 cases',
  timeline: [
    {
      id: 1,
      title: 'Plan confirmed',
      timestamp: '28 Sep · 17:10',
      status: 'completed',
    },
    {
      id: 2,
      title: 'Loaded at Peliyagoda',
      timestamp: '29 Sep · 05:40',
      status: 'completed',
    },
    {
      id: 3,
      title: 'On the way',
      timestamp: 'Departed 05:50',
      status: 'current',
    },
    {
      id: 4,
      title: 'Arrival at your outlet',
      timestamp: 'Pending',
      status: 'pending',
    },
    {
      id: 5,
      title: 'Receipt confirmation',
      timestamp: 'Available after delivery',
      status: 'pending',
    },
  ],
}
