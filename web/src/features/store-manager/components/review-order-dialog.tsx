import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog'
import { Button } from '@/components/ui/shadcn/button'
import { Package, Snowflake } from 'lucide-react'
import type { PlaceOrderFormValues } from '@/features/store-manager/types'

interface ReviewOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: PlaceOrderFormValues | null
  onConfirm: () => void
}

export function ReviewOrderDialog({ open, onOpenChange, data, onConfirm }: ReviewOrderDialogProps) {
  if (!data) return null

  const isAmbient = data.temperatureMode === 'ambient'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-6 bg-stone-50 gap-6 border-neutral-200">
        <DialogHeader>
          <DialogTitle className="text-stone-900 text-2xl font-medium font-sans">Review your order</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Order Information Section */}
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col gap-4">
            <h3 className="text-stone-900 text-base font-medium font-sans">Order information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-stone-500 text-sm font-medium font-sans">Outlet</span>
                <div className="h-9 px-3 bg-white border border-neutral-200 rounded-md flex items-center text-stone-900 text-sm font-sans">{data.outlet}</div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-stone-500 text-sm font-medium font-sans">Serving depot</span>
                <div className="h-9 px-3 bg-white border border-neutral-200 rounded-md flex items-center text-stone-900 text-sm font-sans">Peliyagoda</div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-stone-500 text-sm font-medium font-sans">Requested delivery date</span>
                <div className="h-9 px-3 bg-white border border-neutral-200 rounded-md flex items-center text-stone-900 text-sm font-sans">{data.deliveryDate}</div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-stone-500 text-sm font-medium font-sans">Receiving window</span>
                <div className="h-9 px-3 bg-white border border-neutral-200 rounded-md flex items-center text-stone-900 text-sm font-sans">06:00 – 08:00</div>
              </div>
            </div>
          </div>

          {/* Load Summary Section */}
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-stone-900 text-base font-medium font-sans">Load summary</h3>
              <div className={`h-6 px-2.5 rounded-full flex items-center gap-1.5 ${isAmbient ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                {isAmbient ? <Package className="w-3.5 h-3.5" /> : <Snowflake className="w-3.5 h-3.5" />}
                <span className="text-xs font-medium font-sans capitalize">{data.temperatureMode}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-neutral-200 rounded-lg flex flex-col gap-1">
                <span className="text-stone-500 text-xs font-medium font-sans">Quantity</span>
                <span className="text-stone-900 text-base font-semibold font-sans">
                  {data.quantity} {data.quantityUnit?.toLowerCase() || 'cases'}
                </span>
              </div>
              <div className="p-3 bg-white border border-neutral-200 rounded-lg flex flex-col gap-1">
                <span className="text-stone-500 text-xs font-medium font-sans">Total weight</span>
                <span className="text-stone-900 text-base font-semibold font-sans">{data.weight} kg</span>
              </div>
              <div className="p-3 bg-white border border-neutral-200 rounded-lg flex flex-col gap-1">
                <span className="text-stone-500 text-xs font-medium font-sans">Total volume</span>
                <span className="text-stone-900 text-base font-semibold font-sans">{data.volume} m³</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <span className="text-stone-900 text-sm font-semibold font-sans">Delivery notes</span>
              <span className="text-stone-500 text-sm font-sans">{data.notes || 'No additional notes'}</span>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 items-start">
            <div className="w-5 h-5 bg-blue-700 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold font-serif italic">i</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-stone-900 text-sm font-semibold font-sans">What happens after submission?</p>
              <p className="text-stone-600 text-sm font-sans">Your order will be received immediately. Delivery planning starts after the 16:00 cutoff.</p>
              <p className="text-stone-600 text-sm font-sans">We'll notify you when delivery is scheduled or explain why the order is deferred.</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-200 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-32 h-10 border-neutral-300 text-stone-800 font-semibold font-sans shadow-none">
            Back to edit
          </Button>
          <Button onClick={onConfirm} className="w-32 h-10 bg-yellow-400 hover:bg-yellow-500 text-stone-900 font-semibold font-sans shadow-none">
            Submit order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
