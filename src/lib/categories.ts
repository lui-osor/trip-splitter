import type { ExpenseCategory } from './database.types'

export type CategoryMeta = {
  key: ExpenseCategory
  label: string
  /** Full color for chips/backgrounds. */
  color: string
  /** Very light tint for icon backgrounds. */
  bg: string
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'food',       label: 'Food',       color: '#E9A6A7', bg: '#FBECEC' },
  { key: 'transport',  label: 'Transport',  color: '#8DCDE2', bg: '#E6F3F8' },
  { key: 'stay',       label: 'Stay',       color: '#CBA5FD', bg: '#EFE5FF' },
  { key: 'fun',        label: 'Fun',        color: '#EEEDB3', bg: '#F9F8DF' },
  { key: 'shopping',   label: 'Shopping',   color: '#A7D296', bg: '#E7F1E1' },
  { key: 'other',      label: 'Other',      color: '#E5D8BD', bg: '#F5EFE3' },
  { key: 'settlement', label: 'Settlement', color: '#85D1BD', bg: '#DEF0EA' },
]

export function categoryMeta(key: string | ExpenseCategory): CategoryMeta {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[5] // other
}
