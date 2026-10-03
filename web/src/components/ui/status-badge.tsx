import type { ComponentPropsWithRef, ReactNode } from 'react'
import './status-badge.css'

export type StatusBadgeProps = ComponentPropsWithRef<'span'> & {
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

export function StatusBadge({ tone = 'neutral', size = 'sm', leadingIcon, trailingIcon, children, className = '', ...props }: StatusBadgeProps) {
  return (
    <span {...props} className={`wp-status-badge wp-status-badge--${tone} wp-status-badge--${size} ${size === 'lg' ? 'type-text-sm-medium' : 'type-text-xs-medium'} ${className}`}>
      {leadingIcon && (
        <span className="wp-status-badge-icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      {children}
      {trailingIcon && (
        <span className="wp-status-badge-icon" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </span>
  )
}
