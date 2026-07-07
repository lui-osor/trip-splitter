import logoUrl from '../assets/logo.png'

type Props = {
  /** Rendered height in px. Width auto-scales to preserve the wordmark's aspect ratio. */
  height?: number
  className?: string
}

/**
 * Trip Splitter wordmark. The PNG's native aspect is ~1.44:1 (wide),
 * so we size by height and let width follow.
 */
export function Logo({ height = 48, className = '' }: Props) {
  return (
    <img
      src={logoUrl}
      alt="Trip Splitter"
      className={'block select-none ' + className}
      style={{ height, width: 'auto' }}
      draggable={false}
    />
  )
}
