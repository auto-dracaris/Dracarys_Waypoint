import type { ComponentPropsWithRef, ReactNode } from 'react'
import './icon-button.css'

export type IconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> & {
  'aria-label': string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function IconButton({ size = 'md', children, className = '', type = 'button', ...props }: IconButtonProps) {
  return (
    <button {...props} type={type} className={`icon-button icon-button--${size} ${className}`}>
      <span className="icon-button-icon" aria-hidden="true">
        {children}
      </span>
    </button>
  )
}
