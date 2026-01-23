import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Royal Premium - Glossy Bright Green với Metallic Gold Border
        default: "bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d] text-[#FFF8DC] font-semibold rounded-full border-[2px] border-[#DAA520] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.1),0_0_10px_rgba(218,165,32,0.4),0_2px_8px_rgba(0,0,0,0.15)] hover:from-[#4ade80] hover:via-[#22c55e] hover:to-[#16a34a] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_0_14px_rgba(218,165,32,0.5),0_4px_12px_rgba(0,0,0,0.2)] hover:scale-[1.02] duration-300",
        destructive: "bg-gradient-to-b from-[#ef4444] via-[#dc2626] to-[#b91c1c] text-white font-semibold rounded-full border-[2px] border-[#DAA520]/70 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_0_8px_rgba(218,165,32,0.3)] hover:from-[#f87171] hover:via-[#ef4444] hover:to-[#dc2626] duration-300",
        outline: "bg-transparent text-[#DAA520] font-semibold rounded-full border-[2px] border-[#DAA520] shadow-[0_0_8px_rgba(218,165,32,0.3)] hover:bg-[#16a34a]/10 hover:text-[#FFD700] hover:shadow-[0_0_12px_rgba(218,165,32,0.5)] duration-300",
        secondary: "bg-gradient-to-b from-[#f8f6f0] to-[#f0ede4] text-[#15803d] font-semibold rounded-full border-[2px] border-[#DAA520]/80 shadow-[0_0_8px_rgba(218,165,32,0.25)] hover:border-[#DAA520] hover:shadow-[0_0_12px_rgba(218,165,32,0.4)] duration-300",
        ghost: "text-[#DAA520] rounded-full hover:bg-[#16a34a]/10 border-[2px] border-transparent hover:border-[#DAA520]/50 duration-300",
        link: "text-[#DAA520] underline-offset-4 hover:underline hover:text-[#FFD700] rounded-full",
        premium: "bg-gradient-to-b from-[#4ade80] via-[#22c55e] to-[#16a34a] text-[#FFD700] font-bold rounded-full border-[2px] border-[#DAA520] shadow-[inset_0_2px_6px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.1),0_0_14px_rgba(218,165,32,0.5),0_4px_12px_rgba(0,0,0,0.2)] hover:from-[#86efac] hover:via-[#4ade80] hover:to-[#22c55e] hover:shadow-[inset_0_2px_8px_rgba(255,255,255,0.6),0_0_18px_rgba(218,165,32,0.6),0_6px_16px_rgba(0,0,0,0.25)] hover:scale-[1.03] duration-300",
        light: "bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d] text-[#FFF8DC] font-semibold rounded-full border-[1.5px] border-[#DAA520]/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),0_0_8px_rgba(218,165,32,0.3)] hover:border-[#DAA520] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_0_12px_rgba(218,165,32,0.45)] duration-300",
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
