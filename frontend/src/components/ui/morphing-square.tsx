"use client"

import { cva } from "class-variance-authority"
import { HTMLMotionProps, motion } from "motion/react"

import { cn } from "@/lib/utils"

const morphingSquareVariants = cva("flex gap-2.5 items-center justify-center", {
  variants: {
    messagePlacement: {
      bottom: "flex-col",
      top: "flex-col-reverse",
      right: "flex-row",
      left: "flex-row-reverse",
    },
  },
  defaultVariants: {
    messagePlacement: "bottom",
  },
})

export interface MorphingSquareProps {
  message?: string
  /**
   * Position of the message relative to the spinner.
   * @default bottom
   */
  messagePlacement?: "top" | "bottom" | "left" | "right"
  /**
   * Animation rotation style
   * @default "smooth" (continuous 360 fluid rotation)
   */
  spinStyle?: "smooth" | "linear"
}

export function MorphingSquare({
  className,
  message,
  messagePlacement = "bottom",
  spinStyle = "smooth",
  ...props
}: HTMLMotionProps<"div"> & MorphingSquareProps) {
  return (
    <div className={cn(morphingSquareVariants({ messagePlacement }))}>
      <motion.div
        className={cn(
          "w-7 h-7 bg-[#193f53] select-none",
          className
        )}
        animate={{
          borderRadius: ["6%", "50%", "6%"],
          rotate: [0, 360],
        }}
        transition={
          spinStyle === "linear"
            ? {
                rotate: {
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                },
                borderRadius: {
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                },
              }
            : {
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }
        }
        style={{
          willChange: "transform, border-radius",
        }}
        {...props}
      />
      {message && (
        <div className="text-xs font-medium tracking-wider text-[#193f53] select-none">
          {message}
        </div>
      )}
    </div>
  )
}
