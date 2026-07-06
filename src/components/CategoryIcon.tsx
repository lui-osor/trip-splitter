import type { ExpenseCategory } from '../lib/database.types'

type Props = {
  category: ExpenseCategory
  size?: number
  color?: string
}

/**
 * SVG icon per category, matching the prototype's iconography.
 */
export function CategoryIcon({ category, size = 20, color = '#1E002F' }: Props) {
  const s = size
  const common = {
    width: s,
    height: s,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (category) {
    case 'food':
      return (
        <svg {...common}>
          <path d="M7 3v18M5 3v4M9 3v4M5 7a2 2 0 0 0 4 0" />
          <path d="M16 3c-1.3 0-2.2 2.2-2.2 5.2S14.7 12.5 16 12.5V21" />
        </svg>
      )
    case 'transport':
      return (
        <svg {...common}>
          <path d="M5 11l1.5-4.2A2 2 0 0 1 8.4 5.5h7.2a2 2 0 0 1 1.9 1.3L20 11" />
          <path d="M4 11h16v5H4z" />
          <circle cx="8" cy="18" r="1.5" fill={color} stroke="none" />
          <circle cx="16" cy="18" r="1.5" fill={color} stroke="none" />
        </svg>
      )
    case 'stay':
      return (
        <svg {...common}>
          <path d="M4 11l8-6 8 6" />
          <path d="M6 10v9h12v-9" />
          <path d="M10 19v-5h4v5" />
        </svg>
      )
    case 'fun':
      return (
        <svg {...common}>
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
        </svg>
      )
    case 'shopping':
      return (
        <svg {...common}>
          <path d="M6 8h12l-1 12H7z" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        </svg>
      )
    case 'settlement':
      return (
        <svg {...common}>
          <path d="M5 12l4 4L19 6" />
        </svg>
      )
    case 'other':
    default:
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="1.6" fill={color} stroke="none" />
          <circle cx="12" cy="12" r="1.6" fill={color} stroke="none" />
          <circle cx="18" cy="12" r="1.6" fill={color} stroke="none" />
        </svg>
      )
  }
}
