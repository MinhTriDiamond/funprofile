import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Royal Premium - Xanh đậm bóng nổi bật, viền vàng kim loại sáng
        default: "bg-gradient-to-b from-[#16a34a] via-[#15803d] to-[#166534] text-[#E8D5A3] font-semibold rounded-full border-[2.5px] border-[#FFD700] shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),0_0_10px_rgba(255,215,0,0.45)] hover:from-[#15803d] hover:via-[#166534] hover:to-[#14532d] hover:shadow-[inset_0_2px_6px_rgba(255,255,255,0.3),0_0_14px_rgba(255,215,0,0.55)] duration-200",
        destructive: "bg-gradient-to-b from-[#dc2626] to-[#b91c1c] text-[#E8D5A3] font-semibold rounded-full border-[2.5px] border-[#FFD700]/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),0_0_8px_rgba(255,215,0,0.3)] hover:from-[#b91c1c] hover:to-[#991b1b] duration-200",
        outline: "bg-transparent text-[#E8D5A3] font-semibold rounded-full border-[2.5px] border-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.45)] hover:bg-[#166534]/15 duration-200",
        secondary: "bg-gradient-to-b from-[#f5f5f4] to-[#e7e5e4] text-[#166534] font-semibold rounded-full border-[2.5px] border-[#FFD700] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_0_8px_rgba(255,215,0,0.35)] hover:from-[#e7e5e4] hover:to-[#d6d3d1] duration-200",
        ghost: "text-[#E8D5A3] font-semibold rounded-full hover:bg-[#166534]/15 border-2 border-transparent hover:border-[#FFD700]/60 duration-200",
        link: "text-[#E8D5A3] font-semibold underline-offset-4 hover:underline hover:text-[#FFD700]",
        premium: "bg-gradient-to-b from-[#16a34a] via-[#15803d] to-[#166534] text-[#E8D5A3] font-bold rounded-full border-[3px] border-[#FFD700] shadow-[inset_0_3px_6px_rgba(255,255,255,0.3),0_0_14px_rgba(255,215,0,0.5)] hover:shadow-[inset_0_3px_8px_rgba(255,255,255,0.35),0_0_18px_rgba(255,215,0,0.6)] hover:scale-[1.02] duration-200",
        light: "bg-gradient-to-b from-[#16a34a] to-[#15803d] text-[#E8D5A3] font-semibold rounded-full border-[2.5px] border-[#FFD700] shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),0_0_10px_rgba(255,215,0,0.45)] hover:from-[#15803d] hover:to-[#166534] duration-200",
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
