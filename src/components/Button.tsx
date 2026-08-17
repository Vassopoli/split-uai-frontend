import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-300',
  secondary:
    'bg-white text-[#12251f] border border-black/10 hover:bg-black/[0.03] dark:bg-white/5 dark:text-white dark:border-white/10 dark:hover:bg-white/10',
  ghost: 'text-[#12251f] hover:bg-black/[0.05] dark:text-white dark:hover:bg-white/10',
  danger: 'bg-owe-500 text-white hover:bg-owe-600',
}

const SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}
