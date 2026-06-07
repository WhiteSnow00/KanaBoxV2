import * as React from "react";
import { cn } from "~/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[72px] w-full resize-none rounded-md border border-zinc-300 bg-white/95 px-3 py-2 text-sm text-zinc-900 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-zinc-400 hover:border-zinc-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-70 dark:border-zinc-600/60 dark:bg-zinc-900/80 dark:text-zinc-100 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_0_8px_rgba(255,255,255,0.025)] dark:placeholder:text-zinc-500 dark:hover:border-zinc-500/70 dark:focus-visible:border-indigo-400 dark:focus-visible:ring-indigo-400/10 dark:disabled:bg-zinc-900",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Textarea.displayName = "Textarea";

export { Textarea };
