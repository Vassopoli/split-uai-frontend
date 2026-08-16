import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-black/[0.06] bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]',
        className,
      )}
      {...props}
    />
  )
}
