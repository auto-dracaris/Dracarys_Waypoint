import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Button } from '@/components/ui/button'
import {
  brands,
  dockLabels,
  parkingLabels,
  requirementsError,
  type Brand,
  type DeliveryRequirements,
  type District,
  type DockType,
  type NewOutlet,
  type Outlet,
  type OutletAvailability,
  type ParkingConstraint,
} from '../data'

const titles = { create: 'Add outlet', requirements: 'Edit requirements', availability: 'Update availability' }
const blank: DeliveryRequirements = { district: '', windowStart: '06:00', windowEnd: '09:00', mallWindowStart: '', mallWindowEnd: '', parkingConstraint: 'normal', dockType: 'street', address: '' }

export function OutletEditor({
  outlet,
  mode,
  districts,
  onSave,
  onCreate,
  onClose,
}: {
  outlet?: Outlet
  mode: 'create' | 'requirements' | 'availability'
  districts: District[]
  onSave: (requirements: DeliveryRequirements, availability: OutletAvailability) => Promise<void>
  onCreate: (outlet: NewOutlet) => Promise<void>
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const depots = [...new Set(districts.map((district) => district.depot))]
  const [depot, setDepot] = useState(outlet?.depot ?? depots[0] ?? '')
  const [requirements, setRequirements] = useState<DeliveryRequirements>(outlet ?? { ...blank, district: districts.find((district) => district.depot === depot)?.name ?? '' })
  const [identity, setIdentity] = useState<{ uniqueId: string; name: string; brand: Brand }>({ uniqueId: '', name: '', brand: 'Fresh' })
  const [availability, setAvailability] = useState(outlet?.availability ?? 'Available')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  function field<K extends keyof DeliveryRequirements>(key: K, value: DeliveryRequirements[K]) {
    setRequirements((previous) => ({ ...previous, [key]: value }))
    setError('')
  }
  // The depot is the district's, so choosing a depot picks that depot's first district.
  function chooseDepot(name: string) {
    setDepot(name)
    field('district', districts.find((district) => district.depot === name)?.name ?? '')
  }
  const depotDistricts = districts.filter((district) => district.depot === depot)
  async function submit() {
    const message = mode === 'availability' ? '' : requirementsError(requirements) || (mode === 'create' && !identity.uniqueId.trim() ? 'Enter an outlet ID.' : '')
    setError(message)
    if (message) return
    setSaving(true)
    try {
      if (mode === 'create') await onCreate({ ...requirements, ...identity })
      else await onSave(requirements, availability)
    } catch (reason) {
      setError((reason as Error).message)
      setSaving(false)
    }
  }
  return (
    <dialog ref={dialog} className="stage-notice outlet-editor" aria-labelledby="outlet-editor-title" onCancel={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="flex items-center justify-between gap-wp-space-lg">
          <h2 id="outlet-editor-title" className="type-text-lg-semibold">
            {titles[mode]}
            {outlet && ` · ${outlet.id}`}
          </h2>
          <IconButton type="button" className="" aria-label="Close editor" onClick={onClose}>
            <CloseRounded fontSize="inherit" />
          </IconButton>
        </div>
        <div className="outlet-editor-fields type-text-sm-medium">
          {mode === 'availability' ? (
            <label>
              Availability
              <Select controlSize="sm" value={availability} onChange={(event) => setAvailability(event.target.value as OutletAvailability)}>
                <option>Available</option>
                <option>Unavailable</option>
              </Select>
            </label>
          ) : (
            <>
              {mode === 'create' && (
                <>
                  <div className="outlet-window-fields">
                    <label>
                      Outlet ID
                      <Input
                        controlSize="sm"
                        required
                        maxLength={20}
                        placeholder="OUT121"
                        value={identity.uniqueId}
                        onChange={(event) => {
                          setIdentity((previous) => ({ ...previous, uniqueId: event.target.value }))
                          setError('')
                        }}
                      />
                    </label>
                    <label>
                      Brand
                      <Select controlSize="sm" value={identity.brand} onChange={(event) => setIdentity((previous) => ({ ...previous, brand: event.target.value as Brand }))}>
                        {brands.map((brand) => (
                          <option key={brand}>{brand}</option>
                        ))}
                      </Select>
                    </label>
                  </div>
                  <label>
                    Name (optional)
                    <Input controlSize="sm" maxLength={150} value={identity.name} onChange={(event) => setIdentity((previous) => ({ ...previous, name: event.target.value }))} />
                  </label>
                </>
              )}
              <div className="outlet-window-fields">
                <label>
                  Assigned depot
                  <Select controlSize="sm" value={depot} onChange={(event) => chooseDepot(event.target.value)}>
                    {depots.length ? depots.map((name) => <option key={name}>{name}</option>) : <option>{depot}</option>}
                  </Select>
                </label>
                <label>
                  District
                  <Select controlSize="sm" value={requirements.district} onChange={(event) => field('district', event.target.value)}>
                    {depotDistricts.length ? depotDistricts.map((district) => <option key={district.name}>{district.name}</option>) : <option>{requirements.district}</option>}
                  </Select>
                </label>
              </div>
              <div className="outlet-window-fields">
                <label>
                  Delivery window start
                  <Input controlSize="sm" type="time" required value={requirements.windowStart} onChange={(event) => field('windowStart', event.target.value)} />
                </label>
                <label>
                  Delivery window end
                  <Input controlSize="sm" type="time" required value={requirements.windowEnd} onChange={(event) => field('windowEnd', event.target.value)} />
                </label>
              </div>
              <div className="outlet-window-fields">
                <label>
                  Mall access start
                  <Input controlSize="sm" type="time" value={requirements.mallWindowStart} onChange={(event) => field('mallWindowStart', event.target.value)} />
                </label>
                <label>
                  Mall access end
                  <Input controlSize="sm" type="time" value={requirements.mallWindowEnd} onChange={(event) => field('mallWindowEnd', event.target.value)} />
                </label>
              </div>
              <label>
                Vehicle access
                <Select controlSize="sm" value={requirements.parkingConstraint} onChange={(event) => field('parkingConstraint', event.target.value as ParkingConstraint)}>
                  {Object.entries(parkingLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                Dock type
                <Select controlSize="sm" value={requirements.dockType} onChange={(event) => field('dockType', event.target.value as DockType)}>
                  {Object.entries(dockLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                Delivery address
                <Input controlSize="sm" required value={requirements.address} onChange={(event) => field('address', event.target.value)} />
              </label>
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="type-text-sm-regular text-wp-red-700">
            {error}
          </p>
        )}
        {mode !== 'availability' && <p className="type-text-xs-regular text-wp-text-tertiary">Mall access times apply to outlets inside a mall; leave both blank otherwise.</p>}
        {mode === 'availability' && <p className="type-text-xs-regular text-wp-text-tertiary">Unavailable outlets are left out of delivery planning.</p>}
        <div className="availability-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Add outlet' : `Save ${mode}`}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
