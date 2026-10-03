import type { ComponentPropsWithRef } from 'react'
import './form-control.css'

export type InputProps = ComponentPropsWithRef<'input'> & { invalid?: boolean; controlSize?: 'sm' | 'md' }

export function Input({ invalid = false, controlSize = 'md', className = '', 'aria-invalid': ariaInvalid, ...props }: InputProps) {
  return <input {...props} aria-invalid={invalid || ariaInvalid} className={`wp-form-control wp-form-control--${controlSize} type-text-sm-regular ${className}`} />
}
