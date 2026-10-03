import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import type { User } from '@/features/auth/api'
import { depots, staffRoleLabels, staffStatusLabels, staffStatusTones, type StaffMember } from '../data'

export type StaffAccess = { depot: string; role: User['role']; status: User['status'] }

const roles = Object.keys(staffRoleLabels) as User['role'][]
const statuses = Object.keys(staffStatusLabels) as User['status'][]

// Lives in the details panel; the parent keys it by member so it resets when the selection or the saved values change.
// `self` is the signed-in dispatcher's own account: they may move depot, but the API refuses a change to their own role or status.
export function StaffAccessEditor({ member, self, onSave }: { member: StaffMember; self: boolean; onSave: (next: StaffAccess) => Promise<void> }) {
  const [depot, setDepot] = useState(member.depot)
  const [role, setRole] = useState(member.roleKey)
  const [status, setStatus] = useState(member.statusKey)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const changed = depot !== member.depot || role !== member.roleKey || status !== member.statusKey
  async function submit() {
    setSaving(true)
    setError('')
    try { await onSave({ depot, role, status }) }
    catch (reason) { setError((reason as Error).message) }
    finally { setSaving(false) }
  }
  function reset() { setDepot(member.depot); setRole(member.roleKey); setStatus(member.statusKey); setError('') }
  return <form className="team-access-form" onSubmit={event => { event.preventDefault(); void submit() }}>
    <div className="team-detail-rows type-text-md-regular">
      <label><span className="text-wp-text-tertiary">Depot</span><Select controlSize="sm" required value={depot} onChange={event => setDepot(event.target.value)}>{!depots.includes(member.depot) && <option value={member.depot} disabled>Not set</option>}{depots.map(value => <option key={value}>{value}</option>)}</Select></label>
      <label><span className="text-wp-text-tertiary">Role</span><Select controlSize="sm" disabled={self} value={role} onChange={event => setRole(event.target.value as User['role'])}>{roles.map(value => <option key={value} value={value}>{staffRoleLabels[value]}</option>)}</Select></label>
      <label><span className="text-wp-text-tertiary">Status</span><span className="team-access-status"><Select controlSize="sm" disabled={self} value={status} onChange={event => setStatus(event.target.value as User['status'])}>{statuses.map(value => <option key={value} value={value}>{staffStatusLabels[value]}</option>)}</Select><StatusBadge tone={staffStatusTones[status]}>{staffStatusLabels[status]}</StatusBadge></span></label>
    </div>
    {self && <p className="team-callout team-callout--neutral type-text-sm-regular">You can’t change your own role or status.</p>}
    {status !== member.statusKey && status === 'deleted' && <p className="team-callout team-callout--error type-text-sm-regular">A deleted account leaves this list and can no longer sign in.</p>}
    {status !== member.statusKey && status === 'blocked' && <p className="team-callout team-callout--warning type-text-sm-regular">A blocked account stays on the list but cannot sign in.</p>}
    {error && <p role="alert" className="team-callout team-callout--error type-text-sm-regular">{error}</p>}
    <div className="team-access-actions">
      {changed && <div className="team-access-dirty type-text-sm-regular text-wp-text-tertiary"><span>Unsaved changes</span><Button variant="link" onClick={reset}>Reset</Button></div>}
      <Button type="submit" variant="primary" className="w-full" disabled={saving || !changed}>{saving ? 'Saving…' : 'Save changes'}</Button>
    </div>
  </form>
}
