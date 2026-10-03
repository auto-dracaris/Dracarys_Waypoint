import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Button } from '@/components/ui/button'
import { requirementsError, type DeliveryRequirements, type Outlet, type OutletAvailability } from '../data'

export function OutletEditor({ outlet, mode, onSave, onClose }: { outlet: Outlet; mode: 'requirements' | 'availability'; onSave: (requirements: DeliveryRequirements, availability: OutletAvailability) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [requirements, setRequirements] = useState<DeliveryRequirements>({ depot: outlet.depot, district: outlet.district, windowStart: outlet.windowStart, windowEnd: outlet.windowEnd, access: outlet.access, deliveryPoint: outlet.deliveryPoint })
  const [availability, setAvailability] = useState(outlet.availability)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])
  function field(key: keyof DeliveryRequirements, value: string) { setRequirements(previous => ({ ...previous, [key]: value })); setError('') }
  return <dialog ref={dialog} className="stage-notice outlet-editor" aria-labelledby="outlet-editor-title" onCancel={onClose}>
    <form onSubmit={event => { event.preventDefault(); const message = mode === 'requirements' ? requirementsError(requirements) : ''; setError(message); if (!message) onSave({ ...requirements, depot: requirements.depot.trim(), district: requirements.district.trim(), deliveryPoint: requirements.deliveryPoint.trim() }, availability) }}>
      <div className="flex items-center justify-between gap-wp-space-lg"><h2 id="outlet-editor-title" className="type-text-lg-semibold">{mode === 'requirements' ? 'Edit requirements' : 'Update availability'} · {outlet.id}</h2><IconButton type="button" className="" aria-label="Close editor" onClick={onClose}><CloseRounded fontSize="inherit" /></IconButton></div>
      <div className="outlet-editor-fields type-text-sm-medium">{mode === 'requirements' ? <>
        <label>Assigned depot<Input controlSize="sm" required maxLength={80} value={requirements.depot} onChange={event => field('depot', event.target.value)} /></label><label>District<Input controlSize="sm" required maxLength={80} value={requirements.district} onChange={event => field('district', event.target.value)} /></label>
        <div className="outlet-window-fields"><label>Receiving window start<Input controlSize="sm" type="time" required value={requirements.windowStart} onChange={event => field('windowStart', event.target.value)} /></label><label>Receiving window end<Input controlSize="sm" type="time" required value={requirements.windowEnd} onChange={event => field('windowEnd', event.target.value)} /></label></div>
        <label>Vehicle access<Select controlSize="sm" value={requirements.access} onChange={event => field('access', event.target.value)}><option>Van only</option><option>Standard</option></Select></label><label>Delivery point<Input controlSize="sm" required maxLength={120} value={requirements.deliveryPoint} onChange={event => field('deliveryPoint', event.target.value)} /></label>
      </> : <label>Availability<Select controlSize="sm" value={availability} onChange={event => setAvailability(event.target.value as OutletAvailability)}><option>Available</option><option>Unavailable</option></Select></label>}</div>
      {error && <p role="alert" className="type-text-sm-regular text-wp-red-700">{error}</p>}
      <p className="type-text-xs-regular text-wp-text-tertiary">Saved for this preview only. Delivery allocations remain unchanged.</p>
      <div className="availability-actions"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">Save {mode}</Button></div>
    </form>
  </dialog>
}
