import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "border border-indigo-600 bg-indigo-600 text-white hover:border-indigo-700 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200/70 dark:hover:shadow-indigo-950/40",
                destructive: "border border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700 hover:shadow-md hover:shadow-red-200/70 dark:hover:shadow-red-950/40",
                outline: "border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-600/60 dark:bg-zinc-900/80 dark:text-zinc-200 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_0_8px_rgba(255,255,255,0.025)] dark:hover:border-zinc-500/70 dark:hover:bg-zinc-800/90 dark:hover:text-zinc-50 dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_12px_rgba(255,255,255,0.04)]",
                secondary: "border border-zinc-200 bg-zinc-100 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-200 dark:border-zinc-600/50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500/60 dark:hover:bg-zinc-800",
                ghost: "border border-transparent bg-transparent text-zinc-700 shadow-none hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
                link: "text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-300",
                success: "border border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700",
                warning: "border border-amber-500 bg-amber-500 text-white hover:border-amber-600 hover:bg-amber-600",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-8 px-3 text-xs",
                lg: "h-11 px-6",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
