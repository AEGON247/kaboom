import * as React from "react"
import { cn } from "@/lib/utils"

export function CaptionBox({ 
  children, 
  className,
  variant = 'yellow'
}: { 
  children: React.ReactNode;
  className?: string;
  variant?: 'yellow' | 'magenta' | 'ink'
}) {
  return (
    <div className={cn(
      "relative inline-block border-4 border-[var(--ink-border)] px-4 py-2 font-outfit font-bold shadow-[4px_4px_0px_0px_var(--shadow-color)] z-10",
      variant === 'yellow' && "bg-[var(--brand-yellow)] text-[var(--ink-text)]",
      variant === 'magenta' && "bg-[var(--brand-magenta)] text-[var(--ink-text)]",
      variant === 'ink' && "bg-[var(--ink-border)] text-[var(--bg-base)]",
      className
    )}>
      {children}
      <div className={cn(
          "absolute top-full left-6 w-0 h-0 z-[-1]",
          "border-t-[16px] border-r-[16px] border-solid border-t-[var(--ink-border)] border-r-transparent"
      )} />
      <div className={cn(
          "absolute top-full left-[28px] w-0 h-0 z-[1]",
          "border-t-[10px] border-r-[10px] border-solid border-r-transparent",
          variant === 'yellow' && "border-t-[var(--brand-yellow)]",
          variant === 'magenta' && "border-t-[var(--brand-magenta)]",
          variant === 'ink' && "border-t-[var(--ink-border)]"
      )} />
    </div>
  )
}
