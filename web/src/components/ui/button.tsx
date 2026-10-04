import type { ComponentPropsWithRef, ReactNode } from 'react'
import AutorenewRounded from '@mui/icons-material/AutorenewRounded'
import './button.css'

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'outline' | 'primary' | 'danger' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  loading?: boolean
  loadingLabel?: string
}

const typography = { xs: 'type-text-sm-semibold', sm: 'type-text-sm-semibold', md: 'type-text-md-semibold', lg: 'type-text-lg-semibold', xl: 'type-text-xl-semibold' }

export function Button({ variant = 'outline', size, leadingIcon, trailingIcon, loading = false, loadingLabel, disabled, children, className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || props['aria-busy']}
      className={`wp-button wp-button--${variant} ${size ? `wp-button--${size}` : ''} ${typography[size ?? 'sm']} ${className}`}
    >
      {loading ? (
        <AutorenewRounded aria-hidden="true" className="wp-button-spinner" fontSize="inherit" />
      ) : (
        leadingIcon && (
          <span className="wp-button-icon" aria-hidden="true">
            {leadingIcon}
          </span>
        )
      )}
      {loading && loadingLabel ? loadingLabel : children}
      {!loading && trailingIcon && (
        <span className="wp-button-icon" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </button>
  )
}
