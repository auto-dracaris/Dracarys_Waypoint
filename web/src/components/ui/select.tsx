import type { ComponentPropsWithRef } from 'react'
import './form-control.css'

export type SelectProps = ComponentPropsWithRef<'select'> & { invalid?: boolean; controlSize?: 'sm' | 'md' }

export function Select({ invalid = false, controlSize = 'md', className = '', 'aria-invalid': ariaInvalid, ...props }: SelectProps) {
  return <select {...props} aria-invalid={invalid || ariaInvalid} className={`wp-form-control wp-form-control--${controlSize} type-text-sm-regular ${className}`} />
}
