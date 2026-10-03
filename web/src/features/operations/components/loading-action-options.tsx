import { Textarea } from '@/components/ui/textarea'
import { loadingActions, type LoadingAction, type LoadingException } from '../data'

export function LoadingActionOptions({
  exception,
  action,
  notes,
  error,
  onAction,
  onNotes,
}: {
  exception: LoadingException
  action: LoadingAction
  notes: string
  error: string
  onAction: (action: LoadingAction) => void
  onNotes: (notes: string) => void
}) {
  return (
    <fieldset className="loading-card loading-options" disabled={!!exception.decision}>
      <legend className="sr-only">Choose Action Option</legend>
      <h2 className="type-text-lg-medium">Choose Action Option</h2>
      {loadingActions.map((option) => (
        <div key={option.id} className={`loading-option ${action === option.id ? 'loading-option--selected' : ''}`}>
          <label className="loading-option-label">
            <input type="radio" name="loading-action" value={option.id} checked={action === option.id} onChange={() => onAction(option.id)} />
            <span>
              <strong className="type-text-sm-bold">{option.title}</strong>
              <span className={`type-text-xs-regular ${action === option.id ? 'text-wp-text-secondary' : 'text-wp-text-tertiary'}`}>
                {option.id === 'partial' ? `Proceed with departure of currently loaded ${exception.loadedCases} cases. Prepare a shortage notice for the store.` : option.description}
              </span>
            </span>
          </label>
          {option.id === 'partial' && action === 'partial' && (
            <div className="loading-notes">
              <label htmlFor="loading-store-notes" className="type-text-sm-medium text-wp-text-secondary">
                Reason &amp; Store Notes{' '}
                <span className="text-wp-text-error-primary" aria-hidden="true">
                  *
                </span>
              </label>
              <Textarea
                id="loading-store-notes"
                value={exception.decision?.notes ?? notes}
                required
                aria-invalid={!!error}
                aria-describedby={error ? 'loading-decision-error' : undefined}
                onChange={(event) => onNotes(event.target.value)}
              />
              <div className="loading-revised-metrics type-text-xs-semibold text-wp-text-secondary">
                <span>Revised weight: {exception.revisedWeight} kg</span>
                <span aria-hidden="true" className="text-wp-text-tertiary">
                  |
                </span>
                <span>Revised volume: {exception.revisedVolume} m³</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </fieldset>
  )
}
