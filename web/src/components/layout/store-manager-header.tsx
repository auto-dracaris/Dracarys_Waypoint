import React from 'react'
import { Button } from '@/components/ui/shadcn/button'
import { Calendar, ShoppingCart, Bell, ChevronDown } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  isCurrent?: boolean
}

export interface HeaderProps {
  title: string // e.g., "Ambient delivery"
  deliveryCode: string // e.g., "DEMO-105"
  dateLabel: string // e.g., "Tuesday, 29 September"
  breadcrumbs: BreadcrumbItem[]
  onPlaceOrder?: () => void
  onOpenNotifications?: () => void
  onDateSelect?: () => void
}

export function Header({ title, deliveryCode, dateLabel, breadcrumbs, onPlaceOrder, onOpenNotifications, onDateSelect }: HeaderProps) {
  return (
    <div className="self-stretch flex flex-col gap-5">
      <div className="self-stretch flex justify-between items-start">
        {/* Dynamic Title and Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-stone-800 text-5xl font-medium tracking-tight">{title}</h1>
          <p className="text-gray-500 text-xl font-normal">
            {deliveryCode} · {dateLabel}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={onDateSelect} className="h-10 px-3 bg-white border-neutral-200 text-stone-800 font-semibold gap-2">
            <Calendar className="h-5 w-5" />
            {dateLabel.split('·')[0].trim()}
            <ChevronDown className="h-4 w-4" />
          </Button>

          <Button onClick={onPlaceOrder} className="h-10 px-3 bg-yellow-400 hover:bg-yellow-500 text-stone-900 font-semibold gap-2">
            <span>Place Order</span>
            <ShoppingCart className="h-5 w-5" />
          </Button>

          <Button variant="outline" size="icon" onClick={onOpenNotifications} className="h-10 w-10 bg-white border-neutral-200">
            <Bell className="h-5 w-5 text-stone-800" />
            <span className="sr-only">Notifications</span>
          </Button>
        </div>
      </div>

      {/* Dynamic Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-sm text-stone-400 font-medium">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span>/</span>}
            <span className={item.isCurrent ? 'text-stone-900 font-semibold' : 'text-stone-400'}>{item.label}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
