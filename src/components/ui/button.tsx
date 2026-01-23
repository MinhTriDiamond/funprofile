import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Royal Premium - Ultra Glossy Bright Green với Shiny Metallic Gold
        default: "bg-gradient-to-b from-[#4ade80] via-[#22c55e] to-[#16a34a] text-[#FFD700] font-bold rounded-full border-[2.5px] border-[#FFD700] shadow-[inset_0_3px_6px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.08),0_0_12px_rgba(255,215,0,0.5),0_2px_8px_rgba(0,0,0,0.12)] hover:from-[#86efac] hover:via-[#4ade80] hover:to-[#22c55e] hover:shadow-[inset_0_3px_8px_rgba(255,255,255,0.6),0_0_18px_rgba(255,215,0,0.6),0_4px_12px_rgba(0,0,0,0.15)] hover:scale-[1.02] duration-300",
        destructive: "bg-gradient-to-b from-[#f87171] via-[#ef4444] to-[#dc2626] text-white font-bold rounded-full border-[2.5px] border-[#FFD700]/80 shadow-[inset_0_3px_6px_rgba(255,255,255,0.4),0_0_10px_rgba(255,215,0,0.35)] hover:from-[#fca5a5] hover:via-[#f87171] hover:to-[#ef4444] duration-300",
        outline: "bg-transparent text-[#FFD700] font-bold rounded-full border-[2.5px] border-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.4)] hover:bg-[#22c55e]/15 hover:text-[#FFEC8B] hover:shadow-[0_0_16px_rgba(255,215,0,0.6)] duration-300",
        secondary: "bg-gradient-to-b from-[#fffef5] to-[#f5f3e8] text-[#16a34a] font-bold rounded-full border-[2.5px] border-[#FFD700] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_0_10px_rgba(255,215,0,0.35)] hover:shadow-[0_0_14px_rgba(255,215,0,0.5)] duration-300",
        ghost: "text-[#FFD700] font-bold rounded-full hover:bg-[#22c55e]/15 border-[2px] border-transparent hover:border-[#FFD700]/60 duration-300",
        link: "text-[#FFD700] font-bold underline-offset-4 hover:underline hover:text-[#FFEC8B] rounded-full",
        premium: "bg-gradient-to-b from-[#86efac] via-[#4ade80] to-[#22c55e] text-[#FFD700] font-black rounded-full border-[3px] border-[#FFD700] shadow-[inset_0_4px_8px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.06),0_0_16px_rgba(255,215,0,0.6),0_4px_12px_rgba(0,0,0,0.15)] hover:from-[#bbf7d0] hover:via-[#86efac] hover:to-[#4ade80] hover:shadow-[inset_0_4px_10px_rgba(255,255,255,0.7),0_0_22px_rgba(255,215,0,0.7),0_6px_16px_rgba(0,0,0,0.18)] hover:scale-[1.03] duration-300",
        light: "bg-gradient-to-b from-[#4ade80] via-[#22c55e] to-[#16a34a] text-[#FFD700] font-bold rounded-full border-[2px] border-[#FFD700]/90 shadow-[inset_0_2px_5px_rgba(255,255,255,0.45),0_0_10px_rgba(255,215,0,0.4)] hover:border-[#FFD700] hover:shadow-[inset_0_3px_6px_rgba(255,255,255,0.55),0_0_14px_rgba(255,215,0,0.55)] duration-300",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
