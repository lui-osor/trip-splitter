type Props = {
  name: string
  color: string
  size?: number
  className?: string
}

export function Avatar({ name, color, size = 34, className = '' }: Props) {
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <span
      className={
        'inline-flex items-center justify-center rounded-full flex-shrink-0 font-bold ' +
        className
      }
      style={{
        width: size,
        height: size,
        background: color,
        color: 'var(--color-uv-purple)',
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initial}
    </span>
  )
}
