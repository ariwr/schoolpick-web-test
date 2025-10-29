import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-godding-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-godding-primary text-white hover:bg-godding-primary-dark shadow-sm hover:shadow-md",
        destructive: "bg-godding-accent text-white hover:bg-red-600 shadow-sm hover:shadow-md",
        outline: "border border-godding-primary bg-white text-godding-primary hover:bg-godding-primary hover:text-white",
        secondary: "bg-godding-secondary text-gray-900 hover:bg-gray-200",
        ghost: "hover:bg-godding-secondary text-gray-700",
        link: "text-godding-primary underline-offset-4 hover:underline",
        glass: "bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
