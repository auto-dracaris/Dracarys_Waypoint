import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { FleetVehicle, VehicleAvailability } from '../data'

export function AvailabilityEditor({ vehicle, onSave, onClose }: { vehicle: FleetVehicle; onSave: (status: VehicleAvailability) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [status, setStatus] = useState(vehicle.availability)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} className="stage-notice availability-editor" aria-labelledby="availability-title" onCancel={onClose}>
    <form onSubmit={event => { event.preventDefault(); onSave(status) }}>
      <div className="flex items-center justify-between gap-wp-space-lg"><h2 id="availability-title" className="type-text-lg-semibold">Update {vehicle.id} availability</h2><IconButton type="button" className="" aria-label="Close editor" onClick={onClose}><CloseRounded fontSize="inherit" /></IconButton></div>
      <label className="availability-field type-text-sm-medium">Availability<Select controlSize="sm" value={status} onChange={event => setStatus(event.target.value as VehicleAvailability)}>{(['Available', 'In workshop', 'Unavailable'] as const).map(value => <option key={value}>{value}</option>)}</Select></label>
      <p className="text-wp-text-secondary type-text-sm-regular">Review affected draft trips before publishing the plan.</p>
      <div className="availability-actions"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">Save availability</Button></div>
    </form>
  </dialog>
}
