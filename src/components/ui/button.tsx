import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary via-green-400 to-primary text-primary-foreground rounded-full border-2 border-white/30 shadow-[0_0_20px_hsl(var(--primary-glow)/0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_35px_hsl(var(--primary-glow)/0.8),inset_0_1px_0_rgba(255,255,255,0.5)] hover:scale-105 duration-300",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full",
        outline: "border-2 border-primary/30 bg-transparent text-foreground hover:bg-primary/10 hover:border-primary/50 backdrop-blur-sm rounded-full",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground rounded-md",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-primary via-green-400 to-primary text-white font-bold rounded-full border-2 border-white/40 shadow-[0_0_25px_hsl(var(--primary-glow)/0.7),0_0_50px_hsl(var(--gold)/0.3),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_0_40px_hsl(var(--primary-glow)/0.9),0_0_60px_hsl(var(--gold)/0.5)] hover:scale-105 duration-300",
        light: "bg-gradient-to-r from-primary via-green-400 to-primary text-white font-semibold rounded-full border-2 border-white/40 shadow-[0_0_25px_hsl(var(--primary-glow)/0.7),0_0_50px_hsl(var(--gold)/0.3),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_0_40px_hsl(var(--primary-glow)/0.9),0_0_60px_hsl(var(--gold)/0.5)] hover:scale-105 duration-300",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-11 px-8",
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
