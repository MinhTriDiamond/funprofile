import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Royal Green + Thin Golden Border - Clean & Elegant
        default: "bg-gradient-to-b from-[#166534] to-[#14532d] text-white font-semibold rounded-full border border-[#C9A84C]/60 shadow-sm hover:from-[#14532d] hover:to-[#0f3d22] hover:shadow-md hover:border-[#C9A84C] duration-300",
        destructive: "bg-gradient-to-b from-red-600 to-red-700 text-white font-semibold rounded-full border border-[#C9A84C]/40 shadow-sm hover:from-red-700 hover:to-red-800 hover:border-[#C9A84C]/60 duration-300",
        outline: "bg-transparent text-[#166534] font-semibold rounded-full border border-[#C9A84C]/50 hover:bg-[#166534]/5 hover:border-[#C9A84C] duration-300",
        secondary: "bg-gradient-to-b from-[#f8f6f0] to-[#f0ede4] text-[#166534] font-semibold rounded-full border border-[#C9A84C]/40 shadow-sm hover:border-[#C9A84C]/70 duration-300",
        ghost: "hover:bg-[#166534]/10 hover:text-[#166534] text-[#166534] rounded-md",
        link: "text-[#166534] underline-offset-4 hover:underline",
        premium: "bg-gradient-to-b from-[#166534] via-[#1a7340] to-[#14532d] text-white font-bold rounded-full border border-[#C9A84C] shadow-[0_2px_8px_rgba(201,168,76,0.25)] hover:shadow-[0_4px_12px_rgba(201,168,76,0.35)] hover:scale-[1.02] duration-300",
        light: "bg-gradient-to-b from-[#166534] to-[#14532d] text-white font-semibold rounded-full border border-[#C9A84C]/50 shadow-sm hover:border-[#C9A84C] duration-300",
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
