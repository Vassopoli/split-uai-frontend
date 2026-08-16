import type { ExpenseCategory } from '../types'

/**
 * Same fixed hue → category mapping everywhere a chart shows categories, so
 * the color always means the same thing across the bar and stacked charts.
 * Tailwind auto-generates bg-/fill-/text-cat-* utilities from the
 * --color-cat-* tokens in index.css.
 */
export const CATEGORY_BG_CLASS: Record<ExpenseCategory, string> = {
  food: 'bg-cat-food',
  transport: 'bg-cat-transport',
  home: 'bg-cat-home',
  leisure: 'bg-cat-leisure',
  shopping: 'bg-cat-shopping',
  trip: 'bg-cat-trip',
  other: 'bg-cat-other',
}
