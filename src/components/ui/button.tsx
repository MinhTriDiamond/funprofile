import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Facebook-style green button - Nền xanh đậm, chữ trắng, viền xanh đậm
        default: "bg-[#16a34a] text-white font-semibold rounded-full border-2 border-[#15803d] shadow-sm hover:bg-[#15803d] hover:border-[#166534] active:bg-[#166534] duration-200",
        destructive: "bg-destructive text-destructive-foreground font-semibold rounded-full border-2 border-red-700 shadow-sm hover:bg-destructive/90 duration-200",
        outline: "bg-transparent text-[#16a34a] font-semibold rounded-full border-2 border-[#16a34a] hover:bg-[#16a34a]/10 duration-200",
        secondary: "bg-secondary text-secondary-foreground font-semibold rounded-full border-2 border-gray-300 shadow-sm hover:bg-secondary/80 duration-200",
        ghost: "text-[#16a34a] font-semibold rounded-full hover:bg-[#16a34a]/10 duration-200",
        link: "text-[#16a34a] font-semibold underline-offset-4 hover:underline",
        premium: "bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-white font-bold rounded-full border-2 border-[#15803d] shadow-md hover:from-[#16a34a] hover:to-[#15803d] hover:scale-[1.02] duration-200",
        light: "bg-[#22c55e] text-white font-semibold rounded-full border-2 border-[#16a34a] shadow-sm hover:bg-[#16a34a] duration-200",
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
