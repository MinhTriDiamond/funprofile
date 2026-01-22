import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary via-green-400 to-primary text-white font-semibold rounded-full border-[3px] border-transparent bg-clip-padding shadow-[0_0_8px_rgba(255,255,255,0.6),0_0_20px_rgba(255,255,255,0.3),0_0_40px_hsl(var(--primary-glow)/0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_0_12px_rgba(255,255,255,0.8),0_0_30px_rgba(255,255,255,0.5),0_0_60px_hsl(var(--primary-glow)/0.6),inset_0_1px_2px_rgba(255,255,255,0.6)] hover:scale-105 duration-300 relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-gradient-to-b before:from-white before:via-[#E0E0E0] before:to-[#B0B0B0] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-gradient-to-r after:from-primary after:via-green-400 after:to-primary after:-z-[5] after:content-['']",
        destructive: "bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-semibold rounded-full border-[3px] border-transparent shadow-[0_0_8px_rgba(255,255,255,0.5),0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_12px_rgba(255,255,255,0.7),0_0_30px_rgba(239,68,68,0.6)] hover:scale-105 duration-300 relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-gradient-to-b before:from-white before:via-[#E0E0E0] before:to-[#B0B0B0] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-gradient-to-r after:from-red-600 after:via-red-500 after:to-red-600 after:-z-[5] after:content-['']",
        outline: "bg-transparent text-foreground font-semibold rounded-full border-[3px] border-transparent shadow-[0_0_8px_rgba(255,255,255,0.4),0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_12px_rgba(255,255,255,0.6),0_0_25px_rgba(255,255,255,0.4)] hover:scale-105 duration-300 backdrop-blur-sm relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-gradient-to-b before:from-white before:via-[#E0E0E0] before:to-[#B0B0B0] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-background/80 after:-z-[5] after:content-['']",
        secondary: "bg-secondary text-secondary-foreground font-semibold rounded-full border-[3px] border-transparent shadow-[0_0_6px_rgba(255,255,255,0.3)] hover:shadow-[0_0_10px_rgba(255,255,255,0.5)] hover:scale-105 duration-300 relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-gradient-to-b before:from-[#D0D0D0] before:via-[#B0B0B0] before:to-[#909090] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-secondary after:-z-[5] after:content-['']",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground rounded-md",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-primary via-green-400 to-primary text-white font-bold rounded-full border-[3px] border-transparent shadow-[0_0_10px_rgba(255,255,255,0.7),0_0_25px_rgba(255,255,255,0.4),0_0_50px_hsl(var(--primary-glow)/0.5),0_0_80px_hsl(var(--gold)/0.3)] hover:shadow-[0_0_15px_rgba(255,255,255,0.9),0_0_35px_rgba(255,255,255,0.6),0_0_70px_hsl(var(--primary-glow)/0.7),0_0_100px_hsl(var(--gold)/0.5)] hover:scale-105 duration-300 relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-gradient-to-b before:from-white before:via-[#F0F0F0] before:to-[#C0C0C0] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-gradient-to-r after:from-primary after:via-green-400 after:to-primary after:-z-[5] after:content-['']",
        light: "bg-gradient-to-r from-primary via-green-400 to-primary text-white font-semibold rounded-full border-[3px] border-transparent shadow-[0_0_10px_rgba(255,255,255,0.7),0_0_25px_rgba(255,255,255,0.4),0_0_50px_hsl(var(--primary-glow)/0.5)] hover:shadow-[0_0_15px_rgba(255,255,255,0.9),0_0_35px_rgba(255,255,255,0.6),0_0_70px_hsl(var(--primary-glow)/0.7)] hover:scale-105 duration-300 relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-gradient-to-b before:from-white before:via-[#E0E0E0] before:to-[#B0B0B0] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-gradient-to-r after:from-primary after:via-green-400 after:to-primary after:-z-[5] after:content-['']",
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
