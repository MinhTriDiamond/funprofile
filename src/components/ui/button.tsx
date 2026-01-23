import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Royal Premium - Chữ vàng kim loại nhạt, viền vàng kim loại sáng bóng
        default: "bg-[#16a34a] text-[#E8D5A3] font-semibold rounded-full border-[2.5px] border-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.4)] hover:bg-[#15803d] hover:shadow-[0_0_12px_rgba(255,215,0,0.5)] duration-200",
        destructive: "bg-destructive text-[#E8D5A3] font-semibold rounded-full border-[2.5px] border-[#FFD700]/80 shadow-[0_0_6px_rgba(255,215,0,0.3)] hover:bg-destructive/90 duration-200",
        outline: "bg-transparent text-[#E8D5A3] font-semibold rounded-full border-[2.5px] border-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.4)] hover:bg-[#16a34a]/10 duration-200",
        secondary: "bg-secondary text-[#16a34a] font-semibold rounded-full border-[2.5px] border-[#FFD700] shadow-[0_0_6px_rgba(255,215,0,0.3)] hover:bg-secondary/80 duration-200",
        ghost: "text-[#E8D5A3] font-semibold rounded-full hover:bg-[#16a34a]/10 border-2 border-transparent hover:border-[#FFD700]/60 duration-200",
        link: "text-[#E8D5A3] font-semibold underline-offset-4 hover:underline hover:text-[#FFD700]",
        premium: "bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-[#E8D5A3] font-bold rounded-full border-[3px] border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.5)] hover:shadow-[0_0_16px_rgba(255,215,0,0.6)] hover:scale-[1.02] duration-200",
        light: "bg-[#22c55e] text-[#E8D5A3] font-semibold rounded-full border-[2.5px] border-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.4)] hover:bg-[#16a34a] duration-200",
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
