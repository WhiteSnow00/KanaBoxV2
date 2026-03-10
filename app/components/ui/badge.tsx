import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
                due: "bg-amber-50 text-amber-700 border border-amber-200",
                grace: "bg-orange-50 text-orange-700 border border-orange-200",
                expired: "bg-red-50 text-red-700 border border-red-200",
                none: "bg-zinc-100 text-zinc-600 border border-zinc-200",
                hidden: "bg-zinc-100 text-zinc-500 border border-zinc-300",
                cancelled: "bg-orange-50 text-orange-600 border border-orange-200",
                info: "bg-indigo-50 text-indigo-700 border border-indigo-200",
            },
        },
        defaultVariants: {
            variant: "none",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
