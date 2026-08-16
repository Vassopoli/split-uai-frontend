import {
  Utensils,
  Car,
  Home,
  PartyPopper,
  ShoppingBag,
  Plane,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import type { ExpenseCategory } from '../types'

const ICONS: Record<ExpenseCategory, LucideIcon> = {
  food: Utensils,
  transport: Car,
  home: Home,
  leisure: PartyPopper,
  shopping: ShoppingBag,
  trip: Plane,
  other: Receipt,
}

const LABELS: Record<ExpenseCategory, string> = {
  food: 'Comida',
  transport: 'Transporte',
  home: 'Casa',
  leisure: 'Lazer',
  shopping: 'Compras',
  trip: 'Viagem',
  other: 'Outro',
}

export const CATEGORY_LABELS = LABELS
export const CATEGORY_OPTIONS = Object.keys(LABELS) as ExpenseCategory[]

export function CategoryIcon({
  category,
  className,
}: {
  category: ExpenseCategory
  className?: string
}) {
  const Icon = ICONS[category]
  return <Icon className={className} strokeWidth={2} />
}
