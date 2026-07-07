import logoUrl from '../assets/logo.png'

type Props = {
  size?: number
  className?: string
}

/**
 * The Trip Splitter mark — a camera framing a world map, on an orange disc.
 * The source PNG is already circular; a subtle border-radius clips any
 * remaining anti-aliased edges so the disc sits cleanly on any background.
 */
export function Logo({ size = 52, className = '' }: Props) {
  return (
    <img
      src={logoUrl}
      alt="Trip Splitter"
      width={size}
      height={size}
      className={'block rounded-full select-none ' + className}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}
