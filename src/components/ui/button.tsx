import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary via-green-400 to-primary text-white font-semibold rounded-full border-[3px] border-transparent bg-clip-padding shadow-[0_0_6px_rgba(255,215,0,0.4),0_0_12px_rgba(255,200,0,0.2),0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:shadow-[0_0_10px_rgba(255,215,0,0.6),0_0_20px_rgba(255,200,0,0.35),0_2px_6px_rgba(0,0,0,0.15),inset_0_1px_3px_rgba(255,255,255,0.5)] hover:scale-105 duration-300 relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-[linear-gradient(135deg,#FFF8DC_0%,#FFD700_15%,#FFC125_30%,#FFE55C_50%,#DAA520_70%,#FFD700_85%,#FFFACD_100%)] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-gradient-to-r after:from-primary after:via-green-400 after:to-primary after:-z-[5] after:content-['']",
        destructive: "bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-semibold rounded-full border-[3px] border-transparent shadow-[0_0_6px_rgba(255,215,0,0.4),0_0_12px_rgba(255,200,0,0.2),0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_0_10px_rgba(255,215,0,0.6),0_0_20px_rgba(255,200,0,0.35),0_2px_6px_rgba(0,0,0,0.15)] hover:scale-105 duration-300 relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-[linear-gradient(135deg,#FFF8DC_0%,#FFD700_15%,#FFC125_30%,#FFE55C_50%,#DAA520_70%,#FFD700_85%,#FFFACD_100%)] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-gradient-to-r after:from-red-600 after:via-red-500 after:to-red-600 after:-z-[5] after:content-['']",
        outline: "bg-transparent text-foreground font-semibold rounded-full border-[3px] border-transparent shadow-[0_0_5px_rgba(255,215,0,0.35),0_0_10px_rgba(255,200,0,0.15)] hover:shadow-[0_0_8px_rgba(255,215,0,0.5),0_0_16px_rgba(255,200,0,0.3)] hover:scale-105 duration-300 backdrop-blur-sm relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-[linear-gradient(135deg,#FFF8DC_0%,#FFD700_15%,#FFC125_30%,#FFE55C_50%,#DAA520_70%,#FFD700_85%,#FFFACD_100%)] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-background/80 after:-z-[5] after:content-['']",
        secondary: "bg-secondary text-secondary-foreground font-semibold rounded-full border-[3px] border-transparent shadow-[0_0_4px_rgba(255,215,0,0.3),0_2px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_0_7px_rgba(255,215,0,0.45),0_2px_6px_rgba(0,0,0,0.12)] hover:scale-105 duration-300 relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-[linear-gradient(135deg,#FFF8DC_0%,#FFD700_20%,#DAA520_50%,#B8860B_80%,#DAA520_100%)] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-secondary after:-z-[5] after:content-['']",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground rounded-md",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-primary via-green-400 to-primary text-white font-bold rounded-full border-[3px] border-transparent shadow-[0_0_8px_rgba(255,215,0,0.5),0_0_16px_rgba(255,200,0,0.3),0_2px_6px_rgba(0,0,0,0.12),inset_0_1px_2px_rgba(255,255,255,0.5)] hover:shadow-[0_0_14px_rgba(255,215,0,0.7),0_0_28px_rgba(255,200,0,0.45),0_2px_8px_rgba(0,0,0,0.18),inset_0_1px_3px_rgba(255,255,255,0.6)] hover:scale-105 duration-300 relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-[linear-gradient(135deg,#FFFACD_0%,#FFE55C_10%,#FFD700_25%,#FFC125_40%,#FFE55C_55%,#DAA520_75%,#FFD700_90%,#FFFACD_100%)] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-gradient-to-r after:from-primary after:via-green-400 after:to-primary after:-z-[5] after:content-['']",
        light: "bg-gradient-to-r from-primary via-green-400 to-primary text-white font-semibold rounded-full border-[3px] border-transparent shadow-[0_0_6px_rgba(255,215,0,0.4),0_0_12px_rgba(255,200,0,0.2),0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_0_10px_rgba(255,215,0,0.6),0_0_20px_rgba(255,200,0,0.35),0_2px_6px_rgba(0,0,0,0.15)] hover:scale-105 duration-300 relative before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-[linear-gradient(135deg,#FFF8DC_0%,#FFD700_15%,#FFC125_30%,#FFE55C_50%,#DAA520_70%,#FFD700_85%,#FFFACD_100%)] before:-z-10 before:content-[''] after:absolute after:inset-[3px] after:rounded-full after:bg-gradient-to-r after:from-primary after:via-green-400 after:to-primary after:-z-[5] after:content-['']",
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
