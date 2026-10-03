import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type HTMLAttributes, type PointerEvent, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import './tooltip.css'

export type TooltipProps = {
  children: ReactElement<HTMLAttributes<HTMLElement>>
  content: string
  description?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  disabled?: boolean
  showArrow?: boolean
}

// Preserve the trigger element, its props/ref and its existing event handlers.
export function Tooltip({ children, content, description, placement = 'top', disabled = false, showArrow = true }: TooltipProps) {
  const id = useId()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const popup = useRef<HTMLSpanElement>(null)
  const hovered = useRef(false)
  const focused = useRef(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const open = !!anchor && !disabled
  function cancelClose() { clearTimeout(closeTimer.current) }
  function scheduleClose() {
    cancelClose()
    closeTimer.current = setTimeout(() => { if (!hovered.current && !focused.current) setAnchor(null) }, 150)
  }
  useEffect(() => () => clearTimeout(closeTimer.current), [])
  useEffect(() => {
    if (!open) return
    function dismiss(event: KeyboardEvent) { if (event.key === 'Escape') { clearTimeout(closeTimer.current); setAnchor(null) } }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  }, [open])
  useLayoutEffect(() => {
    if (!open || !anchor) return
    function position() {
      const element = popup.current
      if (!element || !anchor) return
      const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wp-space-md'))
      const bounds = anchor.getBoundingClientRect()
      const width = element.offsetWidth
      const height = element.offsetHeight
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = document.documentElement.clientHeight
      let side = placement
      if (side === 'top' && bounds.top < height + gap) side = 'bottom'
      else if (side === 'bottom' && viewportHeight - bounds.bottom < height + gap) side = 'top'
      else if (side === 'left' && bounds.left < width + gap) side = 'right'
      else if (side === 'right' && viewportWidth - bounds.right < width + gap) side = 'left'
      const x = side === 'left' ? bounds.left - width - gap : side === 'right' ? bounds.right + gap : bounds.left + (bounds.width - width) / 2
      const y = side === 'top' ? bounds.top - height - gap : side === 'bottom' ? bounds.bottom + gap : bounds.top + (bounds.height - height) / 2
      // Positions are measured geometry; all visual styling remains token based.
      element.style.left = `${Math.max(gap, Math.min(x, viewportWidth - width - gap))}px`
      element.style.top = `${Math.max(gap, Math.min(y, viewportHeight - height - gap))}px`
      element.dataset.placement = side
      element.style.visibility = 'visible'
    }
    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true) }
  }, [open, anchor, placement, content, description])
  const original = children.props
  const Trigger = children.type
  const trigger = <Trigger {...original} key={children.key}
    aria-describedby={[original['aria-describedby'], open ? id : undefined].filter(Boolean).join(' ') || undefined}
    onPointerEnter={(event: PointerEvent<HTMLElement>) => { hovered.current = true; cancelClose(); if (!disabled) setAnchor(event.currentTarget); original.onPointerEnter?.(event) }}
    onPointerLeave={(event: PointerEvent<HTMLElement>) => { hovered.current = false; scheduleClose(); original.onPointerLeave?.(event) }}
    onFocus={(event: FocusEvent<HTMLElement>) => { focused.current = true; cancelClose(); if (!disabled) setAnchor(event.currentTarget); original.onFocus?.(event) }}
    onBlur={(event: FocusEvent<HTMLElement>) => { focused.current = false; scheduleClose(); original.onBlur?.(event) }} />
  return <>{trigger}{open && createPortal(<span ref={popup} id={id} role="tooltip" data-placement={placement} className={`wp-tooltip ${description ? 'wp-tooltip--rich' : ''} type-text-xs-regular`}
    onPointerEnter={() => { hovered.current = true; cancelClose() }} onPointerLeave={() => { hovered.current = false; scheduleClose() }}>
    <span className={description ? 'type-text-xs-semibold' : ''}>{content}</span>
    {description && <span className="wp-tooltip-description">{description}</span>}
    {showArrow && <ArrowDropDownRounded className="wp-tooltip-arrow" aria-hidden="true" fontSize="inherit" />}
  </span>, anchor.closest('dialog[open]') ?? document.body)}</>
}
