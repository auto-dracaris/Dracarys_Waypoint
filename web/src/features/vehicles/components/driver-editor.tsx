import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { Driver, FleetVehicle } from '../data'

const NONE = ''

export function DriverEditor({
  vehicle,
  currentDriverId,
  drivers,
  onSave,
  onClose,
}: {
  vehicle: FleetVehicle
  currentDriverId: number | null
  drivers: Driver[]
  onSave: (driverId: number | null) => Promise<void>
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [driverId, setDriverId] = useState(currentDriverId === null ? NONE : String(currentDriverId))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  async function submit() {
    setSaving(true)
    try {
      await onSave(driverId === NONE ? null : Number(driverId))
    } catch (reason) {
      setError((reason as Error).message)
      setSaving(false)
    }
  }
  return (
    <dialog ref={dialog} className="stage-notice availability-editor" aria-labelledby="driver-title" onCancel={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="flex items-center justify-between gap-wp-space-lg">
          <h2 id="driver-title" className="type-text-lg-semibold">
            Assign driver · {vehicle.id}
          </h2>
          <IconButton type="button" className="" aria-label="Close editor" onClick={onClose}>
            <CloseRounded fontSize="inherit" />
          </IconButton>
        </div>
        <label className="availability-field type-text-sm-medium">
          Driver
          <Select controlSize="sm" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
            <option value={NONE}>Not assigned</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </Select>
        </label>
        <p className="text-wp-text-secondary type-text-sm-regular">A driver can be on one vehicle at a time.</p>
        {error && (
          <p role="alert" className="type-text-sm-regular text-wp-red-700">
            {error}
          </p>
        )}
        <div className="availability-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save driver'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
