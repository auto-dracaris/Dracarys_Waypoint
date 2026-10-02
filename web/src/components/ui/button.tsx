import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'outline' | 'primary' | 'danger'
}

export function Button({ variant = 'outline', className = '', ...props }: ButtonProps) {
  return <button type="button" className={`wp-button wp-button--${variant} type-text-sm-semibold ${className}`} {...props} />
}
