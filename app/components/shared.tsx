import * as React from "react";
import { Link } from "@remix-run/react";
import { ArrowLeft, ChevronLeft, ChevronRight, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { SubscriptionStatus } from "~/models/subscriptionStatus";

export const statusVariant: Record<SubscriptionStatus, "active" | "due" | "grace" | "expired" | "none"> = {
    active: "active",
    due: "due",
    grace: "grace",
    expired: "expired",
    none: "none",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
    const variant = statusVariant[status as SubscriptionStatus] || "none";
    return <Badge variant={variant}>{label}</Badge>;
}

export function formatCurrency(amount: number, currency: string): string {
    if (currency === "VND") {
        return `${amount.toLocaleString("vi-VN")} ₫`;
    }
    return `$${amount.toFixed(2)}`;
}

export const statusAccent: Record<string, string> = {
    active: "border-l-emerald-400",
    due: "border-l-amber-400",
    grace: "border-l-orange-400",
    expired: "border-l-red-400",
    none: "border-l-zinc-300",
};

export const DEFAULT_PAGE_SIZE = 20;

export function getPageCount(totalItems: number, pageSize = DEFAULT_PAGE_SIZE): number {
    return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function paginateItems<T>(
    items: T[],
    page: number,
    pageSize = DEFAULT_PAGE_SIZE
): T[] {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
}

export function PaginationControls({
    page,
    pageSize = DEFAULT_PAGE_SIZE,
    totalItems,
    itemLabel = "bản ghi",
    onPageChange,
}: {
    page: number;
    pageSize?: number;
    totalItems: number;
    itemLabel?: string;
    onPageChange: (page: number) => void;
}) {
    const pageCount = getPageCount(totalItems, pageSize);

    if (totalItems <= pageSize) {
        return null;
    }

    const currentPage = Math.min(Math.max(page, 1), pageCount);
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);
    const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
    const visiblePages = pages.filter((candidate) => {
        if (pageCount <= 5) {
            return true;
        }
        if (candidate === 1 || candidate === pageCount) {
            return true;
        }
        return Math.abs(candidate - currentPage) <= 1;
    });

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-2 text-sm text-zinc-500 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium">
                {start}-{end} / {totalItems} {itemLabel}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    aria-label="Trang trước"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {visiblePages.map((candidate, index) => {
                    const previous = visiblePages[index - 1];
                    const hasGap = previous !== undefined && candidate - previous > 1;

                    return (
                        <React.Fragment key={candidate}>
                            {hasGap && <span className="px-1 text-xs text-zinc-400">...</span>}
                            <Button
                                type="button"
                                variant={candidate === currentPage ? "default" : "outline"}
                                size="sm"
                                className="h-8 min-w-8 px-2"
                                onClick={() => onPageChange(candidate)}
                                aria-current={candidate === currentPage ? "page" : undefined}
                            >
                                {candidate}
                            </Button>
                        </React.Fragment>
                    );
                })}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    disabled={currentPage >= pageCount}
                    onClick={() => onPageChange(currentPage + 1)}
                    aria-label="Trang sau"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

export function Breadcrumb({
    items,
}: {
    items: Array<{ label: string; to?: string }>;
}) {
    return (
        <div className="flex items-center gap-2 text-sm">
            {items.map((item, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span className="text-zinc-300">/</span>}
                    {item.to ? (
                        <Link
                            to={item.to}
                            className="text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1"
                        >
                            {i === 0 && <ArrowLeft className="h-3.5 w-3.5" />}
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-zinc-900 font-medium">{item.label}</span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

export function PageHeader({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50 sm:text-3xl">{title}</h1>
                {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>}
            </div>
            {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
        </div>
    );
}

export function EmptyState({
    icon: Icon,
    message,
    children,
}: {
    icon: LucideIcon;
    message: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="icon-tile mx-auto mb-3 h-12 w-12 rounded-lg">
                <Icon className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
            {children}
        </div>
    );
}

export function NoteBlock({
    icon: Icon,
    label,
    text,
}: {
    icon: LucideIcon;
    label: string;
    text: string;
}) {
    return (
        <div className="soft-panel">
            <div className="flex items-center gap-2 mb-1">
                <Icon className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{text}</p>
        </div>
    );
}

export function FormErrorBanner({ message }: { message: string }) {
    return (
        <div className="animate-scale-fade rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-950/30">
            <p className="text-sm text-red-700 dark:text-red-200">{message}</p>
        </div>
    );
}

export function FormMessage({ error, hint }: { error?: string; hint?: string }) {
    if (error) {
        return <p className="text-sm text-red-600">{error}</p>;
    }
    if (hint) {
        return <p className="text-xs text-zinc-400">{hint}</p>;
    }
    return null;
}

export function SearchField({
    value,
    onChange,
    placeholder,
    className,
    inputRef,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
    inputRef?: React.Ref<HTMLInputElement>;
}) {
    return (
        <div className={cn("relative", className)}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="pl-9 pr-9"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Clear search"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}

export function StatCard({
    icon: Icon,
    label,
    count,
    color,
    bg,
    border,
    ring,
    isSelected,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    count: number;
    color: string;
    bg?: string;
    border: string;
    ring: string;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group rounded-lg border p-4 text-left shadow-sm transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/10",
                bg,
                isSelected
                    ? `${border} ring-2 ${ring} shadow-md`
                    : `${border}`
            )}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className={cn("text-xs font-semibold", color)}>{label}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/80 shadow-sm ring-1 ring-zinc-200/70">
                    <Icon className={cn("h-4 w-4", color)} />
                </span>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{count}</p>
        </button>
    );
}

export function InfoItem({
    icon: Icon,
    label,
    children,
}: {
    icon: LucideIcon;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="icon-tile">
                <Icon className="h-4 w-4 text-zinc-500" />
            </div>
            <div>
                <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{label}</p>
                {children}
            </div>
        </div>
    );
}

export function CurrencySelect({
    name,
    id,
    value,
    onChange,
    error,
}: {
    name: string;
    id: string;
    value: "VND" | "USD";
    onChange: (value: "VND" | "USD") => void;
    error?: boolean;
}) {
    return (
        <select
            name={name}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value as "VND" | "USD")}
            className={cn(
                "flex h-10 w-full rounded-md border bg-white/95 px-3 py-2 text-sm text-zinc-900 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-zinc-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus-visible:border-indigo-400 dark:focus-visible:ring-indigo-400/10",
                error ? "border-red-300" : "border-zinc-300"
            )}
            required
        >
            <option value="VND">VND (₫)</option>
            <option value="USD">USD ($)</option>
        </select>
    );
}

const VND_AMOUNT_PRESETS = [50000, 100000, 150000, 200000, 250000, 300000] as const;
export { VND_AMOUNT_PRESETS };

export function AmountPresetChips({
    currentAmount,
    onSelect,
}: {
    currentAmount: number;
    onSelect: (preset: number) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {VND_AMOUNT_PRESETS.map((preset) => (
                <button
                    key={preset}
                    type="button"
                    onClick={() => onSelect(preset)}
                    className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-semibold shadow-sm transition-[background-color,border-color,color,transform] duration-200 hover:-translate-y-0.5 active:translate-y-0",
                        Math.round(currentAmount) === preset
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-950/40 dark:text-indigo-200"
                            : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    )}
                >
                    {preset / 1000}k
                </button>
            ))}
        </div>
    );
}

export function CurrencyAmountInput({
    currency,
    name,
    id,
    value,
    onChange,
    error,
    min,
    step,
    placeholder,
}: {
    currency: "VND" | "USD";
    name: string;
    id: string;
    value: number | string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: boolean;
    min?: string;
    step?: string;
    placeholder?: string;
}) {
    return (
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-zinc-400 text-sm">{currency === "VND" ? "₫" : "$"}</span>
            </div>
            <Input
                type="number"
                name={name}
                id={id}
                min={min || (currency === "VND" ? "1" : "0.01")}
                step={step || (currency === "VND" ? "1" : "0.01")}
                value={value}
                onChange={onChange}
                className={cn("pl-7", error && "border-red-300 focus-visible:ring-red-500")}
                placeholder={placeholder || (currency === "VND" ? "50000" : "2.00")}
                required
            />
        </div>
    );
}

export function MonthsRecommendation({ months }: { months: number }) {
    return (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Gợi ý: <span className="font-medium text-indigo-600 dark:text-indigo-300">{months}</span> tháng (theo số tiền)
        </p>
    );
}

export function FormActions({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
            {children}
        </div>
    );
}
