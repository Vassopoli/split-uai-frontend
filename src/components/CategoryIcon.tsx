import {
  ShoppingCart,
  HeartPulse,
  Utensils,
  Car,
  Home,
  PartyPopper,
  ShoppingBag,
  GraduationCap,
  PawPrint,
  Plane,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import type { ExpenseCategory } from '../types'

const ICONS: Record<ExpenseCategory, LucideIcon> = {
  groceries: ShoppingCart,
  health: HeartPulse,
  food: Utensils,
  transport: Car,
  home: Home,
  leisure: PartyPopper,
  shopping: ShoppingBag,
  education: GraduationCap,
  pets: PawPrint,
  trip: Plane,
  other: Receipt,
}

const LABELS: Record<ExpenseCategory, string> = {
  groceries: 'Mercado',
  health: 'Saúde',
  food: 'Restaurante',
  transport: 'Transporte',
  home: 'Casa',
  leisure: 'Lazer',
  shopping: 'Compras',
  education: 'Educação',
  pets: 'Pets',
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
