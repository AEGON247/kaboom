import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"

export interface PanelCardProps extends HTMLMotionProps<"div"> {
  bgColor?: "white" | "yellow" | "cyan" | "magenta" | "base" | "error" | "none";
  hoverEffect?: boolean;
  showDots?: boolean;
}

const PanelCard = React.forwardRef<HTMLDivElement, PanelCardProps>(
  ({ className, bgColor = "base", hoverEffect = false, showDots = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverEffect ? { 
          scale: 1.01,
          x: -4,
          y: -4,
        } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={cn(
          "border-4 border-[var(--ink-border)] p-8 shadow-[8px_8px_0px_0px_var(--shadow-color)]",
          "relative flex flex-col hover:shadow-[12px_12px_0px_0px_var(--shadow-color)] transition-shadow duration-200 ease-out",
          showDots && "halftone-bg",
          bgColor === "base" && "bg-[var(--bg-panel)] text-[var(--ink-text)]",
          bgColor === "white" && "bg-[#FFFFFF] text-[#0D0D0D]",
          bgColor === "yellow" && "bg-[var(--brand-yellow)] text-[#0D0D0D]",
          bgColor === "cyan" && "bg-[var(--brand-cyan)] text-[#0D0D0D]",
          bgColor === "magenta" && "bg-[var(--brand-magenta)] text-[#0D0D0D]",
          bgColor === "error" && "bg-[var(--brand-error)] text-[#0D0D0D]",
          bgColor === "none" && "bg-transparent",
          className
        )}
        {...(props as any)}
      >
        <div className="absolute inset-0 paper-texture pointer-events-none opacity-10" />
        <div className="relative z-10 w-full h-full">
          {children as React.ReactNode}
        </div>
      </motion.div>
    )
  }
)
PanelCard.displayName = "PanelCard"

export { PanelCard }
