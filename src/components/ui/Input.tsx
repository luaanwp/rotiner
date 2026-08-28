import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Props = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-tinta',
        'placeholder:text-tinta/40',
        'focus-visible:border-roxo-claro focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  )
}
