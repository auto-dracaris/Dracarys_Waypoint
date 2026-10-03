export type LoadingAction = 'correct' | 'partial' | 'replan'
export interface LoadingDecision {
  action: LoadingAction
  notes: string
  recordedAt: string
  departure: 'Held' | 'Approved'
}
export interface LoadingException {
  id: string
  date: string
  depot: string
  vehicleId: string
  trip: string
  version: string
  nextVersion: string
  departure: string
  orderId: string
  destination: string
  requiredCases: number
  requiredWeight: number
  missingCases: number
  damagedCases: number
  loadedCases: number
  revisedWeight: number
  revisedVolume: number
  revisedEta: string
  loader: string
  driver: string
  reportedAt: string
  report: string
  initialNotes: string
  decision: LoadingDecision | null
}

// Independent 28 September operations snapshot supplied by Figma.
// The planning/publication fixtures concern the 29 September delivery run.
export const initialLoadingException: LoadingException = {
  id: 'loading-DEMO-101',
  date: '2026-09-28',
  depot: 'Peliyagoda Hub',
  vehicleId: 'VEH021',
  trip: 'Trip 1',
  version: 'v2.1',
  nextVersion: 'v2.2',
  departure: '07:00 AM',
  orderId: 'DEMO-101',
  destination: 'Keells - Colombo 04',
  requiredCases: 48,
  requiredWeight: 340,
  missingCases: 8,
  damagedCases: 4,
  loadedCases: 36,
  revisedWeight: 255,
  revisedVolume: 1.8,
  revisedEta: '07:15 AM',
  loader: 'Amali Fernando',
  driver: 'Nimal Silva',
  reportedAt: '06:28 AM',
  report: '8 cases of chilled dairy (SKU-4401) not found in staging area. 4 cases of frozen seafood (SKU-5520) damaged during loading — packaging torn.',
  initialNotes: 'Replacement stock unavailable until next cycle. Outlet manager Kamal at Keells Colombo 04 informed via phone at 06:35 AM.',
  decision: null,
}

export const loadingActions: { id: LoadingAction; title: string; description: string }[] = [
  { id: 'correct', title: 'Correct the load', description: 'Keep departure on hold until loader confirms replacement items. Suitable for high-priority items with backup stock available.' },
  { id: 'partial', title: 'Approve partial delivery', description: 'Proceed with departure of currently loaded 36 cases. Prepare a shortage notice for the store.' },
  {
    id: 'replan',
    title: 'Hold and replan the trip',
    description:
      'Remove the affected order from Trip 1, recalculate the route and stop sequence, then publish a new plan version (v2.2) after validation. Loader and driver will receive the updated instructions once the revised plan is published.',
  },
]

export function loadingConsequences(exception: LoadingException, action: LoadingAction): string[] {
  if (action === 'correct')
    return [
      `Keep ${exception.vehicleId} departure on hold`,
      `Request replacements for ${exception.missingCases + exception.damagedCases} cases`,
      `Await a corrected manifest from ${exception.loader}`,
      'Recheck quantities before approving departure',
      'Revised ETA remains unconfirmed',
    ]
  if (action === 'replan')
    return [
      `Keep ${exception.vehicleId} departure on hold`,
      `Propose removing ${exception.orderId} from ${exception.trip}`,
      'Recalculate route and stop sequence before validation',
      `Publish ${exception.nextVersion} only after the revised plan passes validation`,
      'Notify loader and driver after the revised plan is published',
    ]
  return [
    `Update ${exception.orderId} load to ${exception.revisedWeight} kg`,
    `Approve ${exception.vehicleId} departure (revised ETA ${exception.revisedEta})`,
    `Will notify Loader ${exception.loader.split(' ')[0]} — updated manifest`,
    `Will notify Driver ${exception.driver.split(' ')[0]} — proceed departure`,
    `Prepare a store shortage notice for ${exception.destination}`,
  ]
}

export function confirmLoadingDecision(exception: LoadingException, action: string, notes: string, recordedAt: string): { exception: LoadingException; error: string | null } {
  if (exception.decision) return { exception, error: 'A decision has already been recorded for this exception.' }
  if (action !== 'correct' && action !== 'partial' && action !== 'replan') return { exception, error: 'Choose a valid action before confirming.' }
  if (!Number.isFinite(Date.parse(recordedAt))) return { exception, error: 'A valid decision time is required.' }
  if (action === 'partial') {
    if (!notes.trim()) return { exception, error: 'Add a reason and store notes for the partial delivery.' }
    if (
      ![exception.requiredCases, exception.loadedCases, exception.missingCases, exception.damagedCases].every((value) => Number.isInteger(value) && value >= 0) ||
      exception.loadedCases <= 0 ||
      exception.loadedCases > exception.requiredCases ||
      exception.loadedCases !== exception.requiredCases - exception.missingCases - exception.damagedCases
    )
      return { exception, error: 'Loaded and missing/damaged quantities must match the required quantity.' }
    if (
      !Number.isFinite(exception.revisedWeight) ||
      exception.revisedWeight <= 0 ||
      exception.revisedWeight > exception.requiredWeight ||
      !Number.isFinite(exception.revisedVolume) ||
      exception.revisedVolume <= 0
    )
      return { exception, error: 'Valid revised weight and volume are required before partial approval.' }
  }
  return { exception: { ...exception, decision: { action, notes: action === 'partial' ? notes.trim() : '', recordedAt, departure: action === 'partial' ? 'Approved' : 'Held' } }, error: null }
}
