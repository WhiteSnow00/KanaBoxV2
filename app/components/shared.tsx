import { Badge } from "~/components/ui/badge";
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
