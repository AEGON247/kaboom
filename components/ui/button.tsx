import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost"
}

const CTAButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-space font-bold uppercase text-lg px-8 py-4",
          "border-4 border-[var(--ink-border)] transition-all ease-[cubic-bezier(0.175,0.885,0.32,1.275)] duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",

          "hover:-translate-x-1 hover:-translate-y-1",

          "active:translate-x-1.5 active:translate-y-1.5 active:shadow-none active:duration-75",

          variant === "primary" && "bg-[var(--brand-magenta)] text-[var(--ink-text)] shadow-[6px_6px_0px_0px_var(--shadow-color)] hover:shadow-[8px_8px_0px_0px_var(--shadow-color)]",
          variant === "secondary" && "bg-[var(--brand-cyan)] text-[var(--ink-text)] shadow-[6px_6px_0px_0px_var(--shadow-color)] hover:shadow-[8px_8px_0px_0px_var(--shadow-color)]",
          variant === "ghost" && "bg-transparent text-[var(--ink-text)] border-transparent shadow-none hover:border-[var(--ink-border)] hover:bg-[var(--bg-panel)] hover:shadow-[4px_4px_0px_0px_var(--shadow-color)]",
          className
        )}
        {...props}
      />
    )
  }
)
CTAButton.displayName = "CTAButton"

export { CTAButton }
