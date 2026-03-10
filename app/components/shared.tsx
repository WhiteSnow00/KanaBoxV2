import * as React from "react";
import { Link } from "@remix-run/react";
import { ArrowLeft, Search, type LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import type { SubscriptionStatus } from "~/models/subscriptionStatus";

const statusVariantMap: Record<SubscriptionStatus, "active" | "due" | "grace" | "expired" | "none"> = {
    active: "active",
    due: "due",
    grace: "grace",
    expired: "expired",
    none: "none",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
    const variant = statusVariantMap[status as SubscriptionStatus] || "none";
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
                {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
            </div>
            {children}
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 mb-3">
                <Icon className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500">{message}</p>
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
        <div className="rounded-lg bg-zinc-50 p-3">
            <div className="flex items-center gap-2 mb-1">
                <Icon className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-500">{label}</span>
            </div>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{text}</p>
        </div>
    );
}

export function FormErrorBanner({ message }: { message: string }) {
    return (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{message}</p>
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="pl-9"
            />
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
                "group rounded-xl border p-4 text-left transition-all",
                bg,
                isSelected
                    ? `${border} ring-2 ${ring} shadow-sm`
                    : `${border} hover:shadow-sm`
            )}
        >
            <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-4 w-4", color)} />
                <span className={cn("text-xs font-medium", color)}>{label}</span>
            </div>
            <p className={cn("text-2xl font-semibold tabular-nums", color)}>{count}</p>
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                <Icon className="h-4 w-4 text-zinc-500" />
            </div>
            <div>
                <p className="text-xs font-medium text-zinc-400">{label}</p>
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
                "flex h-9 w-full rounded-lg border bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500",
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
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                        Math.round(currentAmount) === preset
                            ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                            : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
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
        <p className="text-xs text-zinc-500">
            Gợi ý: <span className="font-medium text-indigo-600">{months}</span> tháng (theo số tiền)
        </p>
    );
}

export function FormActions({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-end gap-3 pt-2">
            {children}
        </div>
    );
}
