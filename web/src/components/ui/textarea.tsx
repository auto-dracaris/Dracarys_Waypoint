import type { ComponentPropsWithRef } from 'react'
import './form-control.css'

export type TextareaProps = ComponentPropsWithRef<'textarea'> & { invalid?: boolean }

export function Textarea({ invalid = false, className = '', 'aria-invalid': ariaInvalid, ...props }: TextareaProps) {
  return <textarea {...props} aria-invalid={invalid || ariaInvalid} className={`wp-form-control wp-textarea type-text-sm-regular ${className}`} />
}
