import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Button } from '@/components/ui/button'
import { depots, type FuelType, type NewVehicle, type VehicleKind } from '../data'

// The number fields stay text while typing so a half-typed value isn't rewritten.
const blank = {
  uniqueId: '',
  registrationNo: '',
  type: 'van' as VehicleKind,
  depot: depots[0],
  isRefrigerated: false,
  fuelType: 'diesel' as FuelType,
  weightCapKg: '',
  volumeCapM3: '',
  kmPerL: '',
  weeklyFuelQuotaL: '',
}

export function VehicleCreator({ onCreate, onClose }: { onCreate: (vehicle: NewVehicle) => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  function field<K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
    setError('')
  }
  async function submit() {
    const numbers = [form.weightCapKg, form.volumeCapM3, form.kmPerL, form.weeklyFuelQuotaL].map(Number)
    if (!form.uniqueId.trim()) return setError('Enter a vehicle ID.')
    if (numbers.some((value) => !(value > 0))) return setError('Capacity, efficiency and fuel quota must be positive numbers.')
    setSaving(true)
    try {
      await onCreate({ ...form, weightCapKg: numbers[0], volumeCapM3: numbers[1], kmPerL: numbers[2], weeklyFuelQuotaL: numbers[3] })
    } catch (reason) {
      setError((reason as Error).message)
      setSaving(false)
    }
  }
  return (
    <dialog ref={dialog} className="stage-notice outlet-editor" aria-labelledby="vehicle-creator-title" onCancel={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="flex items-center justify-between gap-wp-space-lg">
          <h2 id="vehicle-creator-title" className="type-text-lg-semibold">
            Add vehicle
          </h2>
          <IconButton type="button" className="" aria-label="Close editor" onClick={onClose}>
            <CloseRounded fontSize="inherit" />
          </IconButton>
        </div>
        <div className="fleet-form-fields type-text-sm-medium">
          <div className="fleet-form-row">
            <label>
              Vehicle ID
              <Input controlSize="sm" required maxLength={20} placeholder="VEH031" value={form.uniqueId} onChange={(event) => field('uniqueId', event.target.value)} />
            </label>
            <label>
              Registration (optional)
              <Input controlSize="sm" maxLength={20} value={form.registrationNo} onChange={(event) => field('registrationNo', event.target.value)} />
            </label>
          </div>
          <div className="fleet-form-row">
            <label>
              Type
              <Select controlSize="sm" value={form.type} onChange={(event) => field('type', event.target.value as VehicleKind)}>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
              </Select>
            </label>
            <label>
              Home depot
              <Select controlSize="sm" value={form.depot} onChange={(event) => field('depot', event.target.value)}>
                {depots.map((depot) => (
                  <option key={depot}>{depot}</option>
                ))}
              </Select>
            </label>
          </div>
          <div className="fleet-form-row">
            <label>
              Fuel
              <Select controlSize="sm" value={form.fuelType} onChange={(event) => field('fuelType', event.target.value as FuelType)}>
                <option value="diesel">Diesel</option>
                <option value="petrol">Petrol</option>
              </Select>
            </label>
            <label>
              Refrigerated
              <Select controlSize="sm" value={form.isRefrigerated ? 'yes' : 'no'} onChange={(event) => field('isRefrigerated', event.target.value === 'yes')}>
                <option value="no">No · ambient only</option>
                <option value="yes">Yes · can carry chilled</option>
              </Select>
            </label>
          </div>
          <div className="fleet-form-row">
            <label>
              Weight capacity (kg)
              <Input controlSize="sm" required type="number" min="0" step="0.01" value={form.weightCapKg} onChange={(event) => field('weightCapKg', event.target.value)} />
            </label>
            <label>
              Volume capacity (m³)
              <Input controlSize="sm" required type="number" min="0" step="0.01" value={form.volumeCapM3} onChange={(event) => field('volumeCapM3', event.target.value)} />
            </label>
          </div>
          <div className="fleet-form-row">
            <label>
              Efficiency (km/L)
              <Input controlSize="sm" required type="number" min="0" step="0.01" value={form.kmPerL} onChange={(event) => field('kmPerL', event.target.value)} />
            </label>
            <label>
              Weekly fuel quota (L)
              <Input controlSize="sm" required type="number" min="0" step="0.01" value={form.weeklyFuelQuotaL} onChange={(event) => field('weeklyFuelQuotaL', event.target.value)} />
            </label>
          </div>
        </div>
        {error && (
          <p role="alert" className="type-text-sm-regular text-wp-red-700">
            {error}
          </p>
        )}
        <div className="availability-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add vehicle'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
