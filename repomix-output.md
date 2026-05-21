This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
.env.example
.gitignore
app/components/AdminMemberList.tsx
app/components/CustomerTable.tsx
app/components/PublicLanguageSelect.tsx
app/components/shared.tsx
app/components/ui/alert-dialog.tsx
app/components/ui/badge.tsx
app/components/ui/button.tsx
app/components/ui/card.tsx
app/components/ui/input.tsx
app/components/ui/label.tsx
app/components/ui/separator.tsx
app/components/ui/textarea.tsx
app/i18n/public.ts
app/lib/utils.ts
app/models/customer.server.ts
app/models/payment.server.ts
app/models/subscriptionStatus.ts
app/root.tsx
app/routes/_index.tsx
app/routes/826264._index.tsx
app/routes/826264.customers.$customerId.edit.tsx
app/routes/826264.customers.$customerId.tsx
app/routes/826264.customers.archived.tsx
app/routes/826264.customers.new.tsx
app/routes/826264.payments.$paymentId.edit.tsx
app/routes/826264.payments.new.tsx
app/routes/826264.tsx
app/routes/customers._index.tsx
app/routes/customers.$customerId.edit.tsx
app/routes/customers.$customerId.tsx
app/routes/customers.new.tsx
app/routes/customers.tsx
app/routes/payments.new.tsx
app/tailwind.css
app/utils/date.ts
app/utils/db.server.ts
env.d.ts
package.json
postcss.config.js
scripts/init-db.mjs
tailwind.config.ts
tsconfig.json
vite.config.ts
```

# Files

## File: .env.example
```
# MongoDB Connection URI
# Replace with your actual MongoDB connection string
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/
# For local MongoDB: mongodb://localhost:27017/
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Database name (optional, defaults to "subscription")
MONGODB_DB_NAME=subscription
```

## File: .gitignore
```
node_modules
/.cache
/build
/public/build
.env
.env.local
.env.*.local
.vercel
*.log
npm-debug.log*
.DS_Store
README.md
```

## File: app/components/AdminMemberList.tsx
```typescript
import { Link, useFetcher, useRevalidator } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { Archive, ChevronRight, CreditCard, Eye, Plus, StickyNote } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { cn } from "~/lib/utils";
import type { StatusInfo, SubscriptionStatus } from "~/models/subscriptionStatus";
export type AdminStatusFilter = Exclude<SubscriptionStatus, "none"> | null;
export interface AdminMemberWithStatus {
  customer: {
    _id: string;
    name: string;
    note?: string;
    isPublicHidden?: boolean;
    renewalCancelled?: boolean;
    cancelledAt?: string | null;
  };
  latestPayment: {
    _id: string;
    paidDate: string;
    endDate: string;
    currency: "VND" | "USD";
    amount: number;
    months: number;
    note?: string;
  } | null;
  status: StatusInfo;
}
interface AdminMemberListProps {
  customers: AdminMemberWithStatus[];
  totalCustomerCount: number;
  basePath: string;
  searchTerm: string;
  statusFilter: AdminStatusFilter;
  cancelledOnly: boolean;
}
type ArchiveFetcherData = {
  ok?: boolean;
  error?: string;
  customerId?: string;
};
const statusVariant: Record<string, "active" | "due" | "grace" | "expired" | "none"> = {
  active: "active",
  due: "due",
  grace: "grace",
  expired: "expired",
  none: "none",
};
const rowAccent: Record<string, string> = {
  active: "border-l-emerald-400",
  due: "border-l-amber-400",
  grace: "border-l-orange-400",
  expired: "border-l-red-400",
  none: "border-l-zinc-300",
};
function formatAmount(amount: number, currency: string): string {
  if (currency === "VND") {
    return `${Math.round(amount).toLocaleString("vi-VN")} ₫`;
  }
  return `$${amount.toFixed(2)}`;
}
function formatDays(status: StatusInfo): string {
  if (status.daysToEnd !== null) {
    if (status.daysToEnd === 0) {
      return "Hết hạn hôm nay";
    }
    return `${status.daysToEnd} ngày còn lại`;
  }
  if (status.daysPastEnd !== null) {
    return `${status.daysPastEnd} ngày quá hạn`;
  }
  return "Chưa có ngày hết hạn";
}
function getFilteredEmptyTitle({
  searchTerm,
  statusFilter,
  cancelledOnly,
}: {
  searchTerm: string;
  statusFilter: AdminStatusFilter;
  cancelledOnly: boolean;
}) {
  const trimmedSearch = searchTerm.trim();
  if (trimmedSearch) {
    return `Không có thành viên khớp "${trimmedSearch}"`;
  }
  if (statusFilter && cancelledOnly) {
    return "Không có thành viên khớp bộ lọc này";
  }
  if (cancelledOnly) {
    return "Không có thành viên đã hủy gia hạn";
  }
  if (statusFilter) {
    return "Không có thành viên ở trạng thái này";
  }
  return "Không có thành viên phù hợp";
}
export default function AdminMemberList({
  customers,
  totalCustomerCount,
  basePath,
  searchTerm,
  statusFilter,
  cancelledOnly,
}: AdminMemberListProps) {
  const fetcher = useFetcher<ArchiveFetcherData>();
  const revalidator = useRevalidator();
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [optimisticArchivedIds, setOptimisticArchivedIds] = useState<Set<string>>(new Set());
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  useEffect(() => {
    if (fetcher.state !== "idle" || !pendingArchiveId) {
      return;
    }
    if (fetcher.data?.error) {
      setOptimisticArchivedIds((current) => {
        const next = new Set(current);
        next.delete(pendingArchiveId);
        return next;
      });
      setArchiveError(fetcher.data.error);
    } else if (fetcher.data?.ok) {
      revalidator.revalidate();
    } else {
      setOptimisticArchivedIds((current) => {
        const next = new Set(current);
        next.delete(pendingArchiveId);
        return next;
      });
      setArchiveError("Lưu trữ thành viên thất bại. Vui lòng thử lại.");
    }
    setPendingArchiveId(null);
  }, [fetcher.data, fetcher.state, pendingArchiveId, revalidator]);
  const visibleCustomers = useMemo(
    () => customers.filter((item) => !optimisticArchivedIds.has(item.customer._id)),
    [customers, optimisticArchivedIds]
  );
  const hasActiveFilter = searchTerm.trim() !== "" || statusFilter !== null || cancelledOnly;
  const handleArchiveConfirm = () => {
    if (!archiveTarget) {
      return;
    }
    const target = archiveTarget;
    setArchiveTarget(null);
    setArchiveError(null);
    setPendingArchiveId(target.id);
    setOptimisticArchivedIds((current) => new Set(current).add(target.id));
    fetcher.submit(
      { intent: "archive", customerId: target.id },
      { method: "post", action: "/826264" }
    );
  };
  if (visibleCustomers.length === 0) {
    const title = totalCustomerCount === 0
      ? "Chưa có thành viên nào"
      : getFilteredEmptyTitle({ searchTerm, statusFilter, cancelledOnly });
    const subtitle = totalCustomerCount === 0
      ? "Bắt đầu bằng cách thêm thành viên đầu tiên"
      : hasActiveFilter
        ? "Thử đổi từ khóa hoặc bộ lọc."
        : undefined;
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
          <Eye className="h-6 w-6 text-zinc-400" />
        </div>
        <p className="text-base font-medium text-zinc-700">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
        {archiveError && <p className="mt-3 text-sm text-red-600">{archiveError}</p>}
      </div>
    );
  }
  return (
    <>
      {archiveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {archiveError}
        </div>
      )}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Tên</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Còn lại</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Ngày hết hạn</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Thanh toán gần nhất</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visibleCustomers.map(({ customer, latestPayment, status }) => (
                <tr key={customer._id} className="group transition-colors hover:bg-zinc-50/50">
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`${basePath}/${customer._id}`}
                        className="font-medium text-zinc-900 transition-colors hover:text-indigo-600"
                      >
                        {customer.name}
                      </Link>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                        title="Gia hạn nhanh"
                      >
                        <Link to={`/826264/payments/new?customerId=${customer._id}`}>
                          <Plus className="mr-1 h-3 w-3" />
                          Gia hạn
                        </Link>
                      </Button>
                      {customer.isPublicHidden && <Badge variant="hidden">Ẩn</Badge>}
                      {(customer.note || latestPayment?.note) && (
                        <span title={[customer.note, latestPayment?.note].filter(Boolean).join(" | ")}>
                          <StickyNote className="h-3.5 w-3.5 text-zinc-400" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
                      {customer.renewalCancelled && (
                        <Badge variant="cancelled">Đã hủy gia hạn</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {formatDays(status)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {latestPayment ? (
                      <span className={cn("tabular-nums", status.status === "expired" && "font-medium text-red-600")}>
                        {latestPayment.endDate}
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-zinc-700">
                    {latestPayment ? formatAmount(latestPayment.amount, latestPayment.currency) : (
                      <span className="text-zinc-300">Chưa có thanh toán</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link to={`${basePath}/${customer._id}`}>
                          <ChevronRight className="mr-1 h-3 w-3" />
                          Xem
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setArchiveTarget({ id: customer._id, name: customer.name })}
                      >
                        <Archive className="mr-1 h-3 w-3" />
                        Lưu trữ
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-2 md:hidden">
        {visibleCustomers.map(({ customer, latestPayment, status }) => (
          <div
            key={customer._id}
            className={cn(
              "rounded-xl border border-zinc-200 border-l-[3px] bg-white p-4 shadow-sm",
              rowAccent[status.status] || "border-l-zinc-300"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`${basePath}/${customer._id}`}
                    className="truncate text-sm font-medium text-zinc-900 transition-colors hover:text-indigo-600"
                  >
                    {customer.name}
                  </Link>
                  {customer.isPublicHidden && <Badge variant="hidden">Ẩn</Badge>}
                </div>
                {customer.note && (
                  <p className="mt-1 text-xs text-zinc-400">{customer.note}</p>
                )}
                {latestPayment?.note && (
                  <p className="mt-0.5 text-xs text-zinc-400">{latestPayment.note}</p>
                )}
              </div>
              <Link to={`${basePath}/${customer._id}`} aria-label={`Xem ${customer.name}`}>
                <ChevronRight className="h-5 w-5 text-zinc-400" />
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
              {customer.renewalCancelled && (
                <Badge variant="cancelled">Đã hủy gia hạn</Badge>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-zinc-500">
              <div>
                <span className="text-zinc-400">Còn lại:</span>{" "}
                <span className="font-medium text-zinc-700">{formatDays(status)}</span>
              </div>
              <div>
                <span className="text-zinc-400">Hết hạn:</span>{" "}
                {latestPayment ? (
                  <span className={cn("font-medium", status.status === "expired" ? "text-red-600" : "text-zinc-700")}>
                    {latestPayment.endDate}
                  </span>
                ) : (
                  <span className="text-zinc-300">—</span>
                )}
              </div>
              <div className="col-span-2">
                <span className="text-zinc-400">Thanh toán:</span>{" "}
                {latestPayment ? (
                  <span className="font-medium text-zinc-700">
                    {formatAmount(latestPayment.amount, latestPayment.currency)}
                  </span>
                ) : (
                  <span className="text-zinc-300">Chưa có thanh toán</span>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3">
              <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" asChild>
                <Link to={`/826264/payments/new?customerId=${customer._id}`}>
                  <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                  Gia hạn
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setArchiveTarget({ id: customer._id, name: customer.name })}
              >
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Lưu trữ
              </Button>
            </div>
          </div>
        ))}
      </div>
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu trữ thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn lưu trữ &quot;{archiveTarget?.name}&quot;? Hồ sơ sẽ bị ẩn khỏi bảng nhưng dữ liệu thanh toán vẫn được giữ lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleArchiveConfirm}
            >
              Lưu trữ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

## File: app/components/CustomerTable.tsx
```typescript
import { Link } from "@remix-run/react";
import { ChevronRight, Eye, StickyNote } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
export interface CustomerWithStatus {
  customer: {
    _id: string;
    name: string;
    note?: string;
  };
  latestPayment: {
    _id: string;
    paidDate: string;
    endDate: string;
    currency: "VND" | "USD";
    amount: number;
    months: number;
    note?: string;
  } | null;
  status: {
    status: "active" | "due" | "grace" | "expired" | "none";
    className: string;
    label: string;
    daysToEnd?: number | null;
    daysPastEnd?: number | null;
  };
}
export interface CustomerTableI18n {
  emptyTitle: string;
  emptySubtitle?: string;
  headers: {
    name: string;
    status: string;
    endDate: string;
    latestPayment: string;
  };
  noPayment: string;
  view: string;
}
interface CustomerTableProps {
  customers: CustomerWithStatus[];
  basePath: string;
  i18n?: CustomerTableI18n;
  isFilteredEmpty?: boolean;
  filteredEmptyTitle?: string;
  filteredEmptySubtitle?: string;
}
const statusVariant: Record<string, "active" | "due" | "grace" | "expired" | "none"> = {
  active: "active",
  due: "due",
  grace: "grace",
  expired: "expired",
  none: "none",
};
const rowAccent: Record<string, string> = {
  active: "border-l-emerald-400",
  due: "border-l-amber-400",
  grace: "border-l-orange-400",
  expired: "border-l-red-400",
  none: "border-l-zinc-300",
};
function formatAmount(amount: number, currency: string): string {
  if (currency === "VND") {
    return `${Math.round(amount).toLocaleString("vi-VN")} ₫`;
  }
  return `$${amount.toFixed(2)}`;
}
export default function CustomerTable({
  customers,
  basePath,
  i18n,
  isFilteredEmpty = false,
  filteredEmptyTitle,
  filteredEmptySubtitle,
}: CustomerTableProps) {
  const t: CustomerTableI18n =
    i18n || ({
      emptyTitle: "Chưa có thành viên nào",
      emptySubtitle: "Bắt đầu bằng cách thêm thành viên đầu tiên",
      headers: {
        name: "Tên",
        status: "Trạng thái",
        endDate: "Ngày hết hạn",
        latestPayment: "Thanh toán gần nhất",
      },
      noPayment: "Chưa có thanh toán",
      view: "Xem",
    } satisfies CustomerTableI18n);
  if (customers.length === 0) {
    const emptyTitle = isFilteredEmpty && filteredEmptyTitle ? filteredEmptyTitle : t.emptyTitle;
    const emptySubtitle = isFilteredEmpty ? filteredEmptySubtitle : t.emptySubtitle;
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
          <Eye className="h-6 w-6 text-zinc-400" />
        </div>
        <p className="text-base font-medium text-zinc-700">{emptyTitle}</p>
        {emptySubtitle && (
          <p className="mt-1 text-sm text-zinc-400">{emptySubtitle}</p>
        )}
      </div>
    );
  }
  return (
    <>
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{t.headers.name}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{t.headers.status}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{t.headers.endDate}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{t.headers.latestPayment}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {customers.map(({ customer, latestPayment, status }) => (
                <tr
                  key={customer._id}
                  className="group transition-colors hover:bg-zinc-50/50"
                >
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`${basePath}/${customer._id}`}
                        className="font-medium text-zinc-900 transition-colors hover:text-indigo-600"
                      >
                        {customer.name}
                      </Link>
                      {(customer.note || latestPayment?.note) && (
                        <span title={[customer.note, latestPayment?.note].filter(Boolean).join(" | ")}>
                          <StickyNote className="h-3.5 w-3.5 text-zinc-400" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {latestPayment ? (
                      <span className={cn("tabular-nums", status.status === "expired" && "font-medium text-red-600")}>
                        {latestPayment.endDate}
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-zinc-700">
                    {latestPayment ? formatAmount(latestPayment.amount, latestPayment.currency) : (
                      <span className="text-zinc-300">{t.noPayment}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-2 md:hidden">
        {customers.map(({ customer, latestPayment, status }) => (
          <div
            key={customer._id}
            className={cn(
              "rounded-xl border border-zinc-200 border-l-[3px] bg-white p-4 shadow-sm",
              rowAccent[status.status] || "border-l-zinc-300"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  to={`${basePath}/${customer._id}`}
                  className="truncate text-sm font-medium text-zinc-900 transition-colors hover:text-indigo-600"
                >
                  {customer.name}
                </Link>
                {customer.note && (
                  <p className="mt-1 text-xs text-zinc-400">{customer.note}</p>
                )}
                {latestPayment?.note && (
                  <p className="mt-0.5 text-xs text-zinc-400">{latestPayment.note}</p>
                )}
              </div>
              <Link to={`${basePath}/${customer._id}`} aria-label={`${t.view} ${customer.name}`}>
                <ChevronRight className="h-5 w-5 text-zinc-400" />
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-zinc-500">
              <div>
                <span className="text-zinc-400">{t.headers.endDate}:</span>{" "}
                {latestPayment ? (
                  <span className={cn("font-medium", status.status === "expired" ? "text-red-600" : "text-zinc-700")}>
                    {latestPayment.endDate}
                  </span>
                ) : (
                  <span className="text-zinc-300">—</span>
                )}
              </div>
              <div>
                <span className="text-zinc-400">{t.headers.latestPayment}:</span>{" "}
                {latestPayment ? (
                  <span className="font-medium text-zinc-700">
                    {formatAmount(latestPayment.amount, latestPayment.currency)}
                  </span>
                ) : (
                  <span className="text-zinc-300">{t.noPayment}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
```

## File: app/components/PublicLanguageSelect.tsx
```typescript
import { useSearchParams } from "@remix-run/react";
import { Globe } from "lucide-react";
import type { PublicLang } from "~/i18n/public";
export default function PublicLanguageSelect({
  lang,
  label,
  optionVi,
  optionEn,
}: {
  lang: PublicLang;
  label: string;
  optionVi: string;
  optionEn: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-zinc-400" />
      <select
        id="public-lang"
        name="lang"
        value={lang}
        onChange={(e) => {
          const nextLang = e.target.value === "en" ? "en" : "vi";
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set("lang", nextLang);
          setSearchParams(nextParams);
        }}
        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
        aria-label={label}
      >
        <option value="vi">{optionVi}</option>
        <option value="en">{optionEn}</option>
      </select>
    </div>
  );
}
```

## File: app/components/shared.tsx
```typescript
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
```

## File: app/components/ui/alert-dialog.tsx
```typescript
import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";
const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogOverlay = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Overlay
        className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
        ref={ref}
    />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;
const AlertDialogContent = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
    <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-200 bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl",
                className
            )}
            {...props}
        />
    </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;
const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";
const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
AlertDialogFooter.displayName = "AlertDialogFooter";
const AlertDialogTitle = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Title
        ref={ref}
        className={cn("text-lg font-semibold text-zinc-900", className)}
        {...props}
    />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;
const AlertDialogDescription = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-zinc-500", className)}
        {...props}
    />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;
const AlertDialogAction = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Action>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Action
        ref={ref}
        className={cn(buttonVariants(), className)}
        {...props}
    />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;
const AlertDialogCancel = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Cancel
        ref={ref}
        className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
        {...props}
    />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;
export {
    AlertDialog,
    AlertDialogPortal,
    AlertDialogOverlay,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
};
```

## File: app/components/ui/badge.tsx
```typescript
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
```

## File: app/components/ui/button.tsx
```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";
const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-indigo-600 text-white shadow hover:bg-indigo-700",
                destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
                outline: "border border-zinc-300 bg-white shadow-sm hover:bg-zinc-50 text-zinc-700",
                secondary: "bg-zinc-100 text-zinc-900 shadow-sm hover:bg-zinc-200",
                ghost: "hover:bg-zinc-100 text-zinc-700",
                link: "text-indigo-600 underline-offset-4 hover:underline",
                success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
                warning: "bg-amber-500 text-white shadow-sm hover:bg-amber-600",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-10 rounded-lg px-6",
                icon: "h-9 w-9",
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
```

## File: app/components/ui/card.tsx
```typescript
import * as React from "react";
import { cn } from "~/lib/utils";
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("rounded-xl border border-zinc-200 bg-white shadow-sm", className)}
            {...props}
        />
    )
);
Card.displayName = "Card";
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
    )
);
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight text-zinc-900", className)} {...props} />
    )
);
CardTitle.displayName = "CardTitle";
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p ref={ref} className={cn("text-sm text-zinc-500", className)} {...props} />
    )
);
CardDescription.displayName = "CardDescription";
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
    )
);
CardContent.displayName = "CardContent";
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
    )
);
CardFooter.displayName = "CardFooter";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

## File: app/components/ui/input.tsx
```typescript
import * as React from "react";
import { cn } from "~/lib/utils";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }
const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";
export { Input };
```

## File: app/components/ui/label.tsx
```typescript
import * as React from "react";
import { cn } from "~/lib/utils";
const Label = React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(
            "text-sm font-medium leading-none text-zinc-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            className
        )}
        {...props}
    />
));
Label.displayName = "Label";
export { Label };
```

## File: app/components/ui/separator.tsx
```typescript
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "~/lib/utils";
const Separator = React.forwardRef<
    React.ElementRef<typeof SeparatorPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
    (
        { className, orientation = "horizontal", decorative = true, ...props },
        ref
    ) => (
        <SeparatorPrimitive.Root
            ref={ref}
            decorative={decorative}
            orientation={orientation}
            className={cn(
                "shrink-0 bg-zinc-200",
                orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
                className
            )}
            {...props}
        />
    )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;
export { Separator };
```

## File: app/components/ui/textarea.tsx
```typescript
import * as React from "react";
import { cn } from "~/lib/utils";
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[60px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50",
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
```

## File: app/i18n/public.ts
```typescript
export type PublicLang = "vi" | "en";
export function normalizePublicLang(value: string | null | undefined): PublicLang {
  return value === "en" || value === "vi" ? value : "vi";
}
const STRINGS = {
  vi: {
    languageLabel: "Ngôn ngữ",
    languageOptions: {
      vi: "Tiếng Việt",
      en: "English",
    },
    membersHeading: "Thành viên",
    membersCount: (count: number) => `Tổng cộng có ${count} thành viên`,
    statusLegendLabel: "Màu trạng thái:",
    statusLabels: {
      none: "Chưa có thanh toán",
      active: "Còn hạn",
      due: "Sắp đến hạn",
      grace: "Quá hạn (cao su)",
      expired: "Hết hạn",
    },
    customerTable: {
      emptyTitle: "Chưa có thành viên nào",
      emptySubtitle: "",
      headers: {
        name: "Tên",
        status: "Trạng thái",
        endDate: "Ngày hết hạn",
        latestPayment: "Thanh toán gần nhất",
        months: "Số tháng",
        note: "Ghi chú",
        actions: "Thao tác",
      },
      noPayment: "Chưa có thanh toán",
      view: "Xem →",
      formatMonths: (months: number) => `${months} tháng`,
    },
    customerDetail: {
      subscriptionStatusHeading: "Trạng thái đăng ký",
      currentPeriodEnds: "Hết hạn kỳ hiện tại",
      latestPayment: "Thanh toán gần nhất",
      paidDate: "Ngày thanh toán",
      months: "Số tháng",
      note: "Ghi chú",
      noPaymentHistory: "Chưa có lịch sử thanh toán.",
    },
  },
  en: {
    languageLabel: "Language",
    languageOptions: {
      vi: "Vietnamese",
      en: "English",
    },
    membersHeading: "Members",
    membersCount: (count: number) => `Total ${count} members`,
    statusLegendLabel: "Status colors:",
    statusLabels: {
      none: "No Payment",
      active: "Active",
      due: "Due",
      grace: "Grace",
      expired: "Expired",
    },
    customerTable: {
      emptyTitle: "No members yet",
      emptySubtitle: "",
      headers: {
        name: "Name",
        status: "Status",
        endDate: "Expiry date",
        latestPayment: "Latest payment",
        months: "Months",
        note: "Note",
        actions: "Actions",
      },
      noPayment: "No payment",
      view: "View →",
      formatMonths: (months: number) =>
        `${months} ${months === 1 ? "month" : "months"}`,
    },
    customerDetail: {
      subscriptionStatusHeading: "Subscription status",
      currentPeriodEnds: "Current period ends",
      latestPayment: "Latest payment",
      paidDate: "Paid date",
      months: "Months",
      note: "Note",
      noPaymentHistory: "No payment history.",
    },
  },
} as const;
export type PublicStrings = (typeof STRINGS)[PublicLang];
export function getPublicStrings(lang: PublicLang): PublicStrings {
  return STRINGS[lang];
}
```

## File: app/lib/utils.ts
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
```

## File: app/models/customer.server.ts
```typescript
import { ObjectId } from "mongodb";
import { getDb } from "~/utils/db.server";
import { getTodayDateOnly } from "~/utils/date";
export interface NameHistoryEntry {
  name: string;
  changedAt: string;
}
export interface Customer {
  _id: ObjectId;
  displayName: string;
  nameHistory?: NameHistoryEntry[];
  note?: string;
  isPublicHidden?: boolean;
  hiddenAt?: Date;
  hiddenReason?: string;
  renewalCancelled?: boolean;
  cancelledAt?: string;
  isArchived?: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export interface CustomerInput {
  displayName: string;
  note?: string;
}
export async function findArchivedByName(name: string): Promise<Customer | null> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  return collection.findOne({
    displayName: { $regex: `^${name.trim()}$`, $options: "i" },
    isArchived: true,
  });
}
export async function unarchiveCustomer(id: string, note?: string): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const setOps: Record<string, unknown> = {
    isArchived: false,
    isPublicHidden: false,
    renewalCancelled: false,
    updatedAt: new Date(),
  };
  if (note !== undefined) {
    setOps.note = note || undefined;
  }
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: setOps,
      $unset: {
        archivedAt: "",
        hiddenAt: "",
        hiddenReason: "",
        cancelledAt: "",
      },
    },
    { returnDocument: "after" }
  );
  return result;
}
export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const now = new Date();
  const customer: Omit<Customer, "_id"> = {
    displayName: input.displayName.trim(),
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(customer as Customer);
  return {
    _id: result.insertedId,
    ...customer,
  } as Customer;
}
export async function listCustomers(
  searchQuery?: string,
  options?: { publicOnly?: boolean; includeArchived?: boolean }
): Promise<Customer[]> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const filter: Record<string, unknown> = {};
  if (!options?.includeArchived) {
    filter.isArchived = { $ne: true };
  }
  if (options?.publicOnly) {
    filter.isPublicHidden = { $ne: true };
  }
  if (searchQuery && searchQuery.trim()) {
    filter.displayName = { $regex: searchQuery.trim(), $options: "i" };
  }
  return collection
    .find(filter)
    .sort({ displayName: 1 })
    .toArray();
}
export async function getCustomerById(id: string): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  return collection.findOne({ _id: new ObjectId(id) });
}
export async function updateCustomerNote(
  id: string,
  note: string | undefined
): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        note: note?.trim() || undefined,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return result;
}
export async function countCustomers(): Promise<number> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  return collection.countDocuments({ isArchived: { $ne: true } });
}
export async function customerExistsByDisplayName(
  name: string,
  excludeArchived = true
): Promise<boolean> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const filter: Record<string, unknown> = {
    displayName: { $regex: `^${name.trim()}$`, $options: "i" },
  };
  if (excludeArchived) {
    filter.isArchived = { $ne: true };
  }
  const count = await collection.countDocuments(filter);
  return count > 0;
}
export async function hideCustomerFromPublic(
  id: string,
  reason?: string
): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        isPublicHidden: true,
        hiddenAt: new Date(),
        hiddenReason: reason || "cancelled",
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return result;
}
export async function unhideCustomer(id: string): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        isPublicHidden: false,
        updatedAt: new Date(),
      },
      $unset: {
        hiddenAt: "",
        hiddenReason: "",
      },
    },
    { returnDocument: "after" }
  );
  return result;
}
export async function setRenewalCancelled(
  id: string,
  cancelled: boolean
): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const update: Record<string, unknown> = {
    $set: {
      renewalCancelled: cancelled,
      updatedAt: new Date(),
    },
  };
  if (cancelled) {
    (update.$set as { cancelledAt: string }).cancelledAt = getTodayDateOnly();
  } else {
    update.$unset = { cancelledAt: "" };
  }
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    update,
    { returnDocument: "after" }
  );
  return result;
}
export async function archiveCustomer(id: string): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        isArchived: true,
        archivedAt: new Date(),
        isPublicHidden: true,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return result;
}
export async function deleteCustomer(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isArchived: true,
        archivedAt: new Date(),
        isPublicHidden: true,
        updatedAt: new Date(),
      },
    }
  );
  return result.modifiedCount === 1;
}
export async function updateCustomer(
  id: string,
  input: { displayName: string; note?: string }
): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const current = await collection.findOne({ _id: new ObjectId(id) });
  if (!current) {
    return null;
  }
  const today = getTodayDateOnly();
  const nextDisplayName = input.displayName.trim();
  const setOps: Record<string, unknown> = {
    displayName: nextDisplayName,
    updatedAt: new Date(),
  };
  const unsetOps: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(input, "note")) {
    const nextNote = input.note?.trim() || "";
    if (nextNote) {
      setOps.note = nextNote;
    } else {
      unsetOps.note = "";
    }
  }
  const updateDoc: Record<string, unknown> = { $set: setOps };
  if (Object.keys(unsetOps).length > 0) {
    updateDoc.$unset = unsetOps;
  }
  if (current.displayName !== nextDisplayName) {
    const historyEntry: NameHistoryEntry = {
      name: current.displayName,
      changedAt: today,
    };
    updateDoc.$push = { nameHistory: historyEntry };
  }
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    updateDoc,
    { returnDocument: "after" }
  );
  return result;
}
export async function cancelRenewal(id: string): Promise<Customer | null> {
  return setRenewalCancelled(id, true);
}
export async function resumeRenewal(id: string): Promise<Customer | null> {
  return setRenewalCancelled(id, false);
}
```

## File: app/models/payment.server.ts
```typescript
import { ObjectId } from "mongodb";
import { getDb } from "~/utils/db.server";
import {
  addMonthsDateOnly,
  getMonthBucket,
  getRevenueBucketRange,
} from "~/utils/date";
import {
  DUE_SOON_DAYS,
  GRACE_DAYS,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
  USD_TO_VND_RATE,
  type Currency,
  type SubscriptionStatus,
  type StatusInfo,
  computeStatus,
  calculateRecommendedMonths,
} from "~/models/subscriptionStatus";
export {
  DUE_SOON_DAYS,
  GRACE_DAYS,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
  USD_TO_VND_RATE,
  type Currency,
  type SubscriptionStatus,
  type StatusInfo,
  computeStatus,
  calculateRecommendedMonths,
};
export interface Payment {
  _id: ObjectId;
  customerId: ObjectId;
  paidDate: string;
  currency: Currency;
  amount: number;
  months: number;
  endDate: string;
  note?: string;
  isVoided?: boolean;
  voidedAt?: Date;
  createdAt: Date;
}
export interface PaymentInput {
  customerId: string;
  paidDate: string;
  currency: Currency;
  amount: number;
  months: number;
  note?: string;
}
export async function createPayment(input: PaymentInput): Promise<Payment> {
  const db = await getDb();
  const collection = db.collection<Payment>("payments");
  const endDate = addMonthsDateOnly(input.paidDate, input.months);
  const sanitizedAmount =
    input.currency === "VND"
      ? Math.round(input.amount)
      : Math.round(input.amount * 100) / 100;
  const now = new Date();
  const payment: Omit<Payment, "_id"> = {
    customerId: new ObjectId(input.customerId),
    paidDate: input.paidDate,
    currency: input.currency,
    amount: sanitizedAmount,
    months: input.months,
    endDate,
    note: input.note?.trim() || undefined,
    createdAt: now,
  };
  const result = await collection.insertOne(payment as Payment);
  return {
    _id: result.insertedId,
    ...payment,
  } as Payment;
}
export async function listPaymentsForCustomer(
  customerId: string
): Promise<Payment[]> {
  if (!ObjectId.isValid(customerId)) {
    return [];
  }
  const db = await getDb();
  const collection = db.collection<Payment>("payments");
  return collection
    .find({ customerId: new ObjectId(customerId), isVoided: { $ne: true } })
    .sort({ paidDate: -1 })
    .toArray();
}
export async function getLatestPaymentForCustomer(
  customerId: string
): Promise<Payment | null> {
  if (!ObjectId.isValid(customerId)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Payment>("payments");
  return collection
    .find({ customerId: new ObjectId(customerId), isVoided: { $ne: true } })
    .sort({ paidDate: -1 })
    .limit(1)
    .next();
}
export async function listLatestPaymentsForAllCustomers(): Promise<
  Map<string, Payment>
> {
  const db = await getDb();
  const collection = db.collection<Payment>("payments");
  const results = await collection
    .aggregate<{
      _id: ObjectId;
      latestPayment: Payment;
    }>([
      {
        $match: { isVoided: { $ne: true } },
      },
      {
        $sort: { paidDate: -1 },
      },
      {
        $group: {
          _id: "$customerId",
          latestPayment: { $first: "$$ROOT" },
        },
      },
    ])
    .toArray();
  const map = new Map<string, Payment>();
  for (const result of results) {
    map.set(result._id.toString(), result.latestPayment);
  }
  return map;
}
export async function listPaymentsForRevenueWindow(
  startDate: string,
  endDate: string
): Promise<Payment[]> {
  const db = await getDb();
  const collection = db.collection<Payment>("payments");
  return collection
    .find({
      paidDate: {
        $gte: startDate,
        $lte: endDate,
      },
      isVoided: { $ne: true },
    })
    .toArray();
}
export interface MonthlyAllocation {
  monthBucket: string;
  amount: number;
  currency: Currency;
}
export function allocatePaymentToMonths(
  payment: Payment
): MonthlyAllocation[] {
  const allocations: MonthlyAllocation[] = [];
  const { amount, months, currency, paidDate } = payment;
  const baseAmount = currency === "VND"
    ? Math.floor(amount / months)
    : Math.floor((amount / months) * 100) / 100;
  const totalBase = currency === "VND"
    ? baseAmount * months
    : Math.round(baseAmount * months * 100) / 100;
  const remainder = currency === "VND"
    ? amount - totalBase
    : Math.round((amount - totalBase) * 100) / 100;
  const remainderPerMonth = currency === "VND"
    ? 1
    : 0.01;
  const monthsWithExtra = currency === "VND"
    ? remainder
    : Math.round(remainder / 0.01);
  for (let i = 0; i < months; i++) {
    const periodStart = addMonthsDateOnly(paidDate, i);
    const monthBucket = getMonthBucket(periodStart);
    const monthAmount = currency === "VND"
      ? baseAmount + (i < monthsWithExtra ? remainderPerMonth : 0)
      : Math.round((baseAmount + (i < monthsWithExtra ? remainderPerMonth : 0)) * 100) / 100;
    allocations.push({
      monthBucket,
      amount: monthAmount,
      currency,
    });
  }
  return allocations;
}
export async function getPaymentById(id: string): Promise<Payment | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Payment>("payments");
  return collection.findOne({ _id: new ObjectId(id) });
}
export async function updatePayment(
  input: {
    id: string;
    paidDate: string;
    currency: Currency;
    amount: number;
    months: number;
    note?: string;
  }
): Promise<Payment | null> {
  const { id, ...updates } = input;
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Payment>("payments");
  const endDate = addMonthsDateOnly(updates.paidDate, updates.months);
  const sanitizedAmount =
    updates.currency === "VND"
      ? Math.round(updates.amount)
      : Math.round(updates.amount * 100) / 100;
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        paidDate: updates.paidDate,
        currency: updates.currency,
        amount: sanitizedAmount,
        months: updates.months,
        endDate,
        note: updates.note?.trim() || undefined,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return result;
}
export async function voidPayment(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }
  const db = await getDb();
  const collection = db.collection<Payment>("payments");
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isVoided: true,
        voidedAt: new Date(),
      },
    }
  );
  return result.modifiedCount === 1;
}
export function computeMonthlyTotals(
  payments: Payment[],
  monthBuckets: string[]
): Map<string, { VND: number; USD: number; convertedVnd: number }> {
  const totals = new Map<string, { VND: number; USD: number; convertedVnd: number }>();
  for (const bucket of monthBuckets) {
    totals.set(bucket, { VND: 0, USD: 0, convertedVnd: 0 });
  }
  for (const payment of payments) {
    for (const bucket of monthBuckets) {
      const { start, end } = getRevenueBucketRange(bucket);
      if (payment.paidDate >= start && payment.paidDate <= end) {
        const current = totals.get(bucket)!;
        if (payment.currency === "VND") {
          current.VND += Math.round(payment.amount);
        } else {
          current.USD = Math.round((current.USD + payment.amount) * 100) / 100;
        }
        break;
      }
    }
  }
  for (const [bucket, data] of totals) {
    data.convertedVnd = Math.round(data.VND + data.USD * USD_TO_VND_RATE);
    totals.set(bucket, data);
  }
  return totals;
}
```

## File: app/models/subscriptionStatus.ts
```typescript
import { diffDaysDateOnly, getTodayDateOnly } from "~/utils/date";
export const DUE_SOON_DAYS = 3;
export const GRACE_DAYS = 7;
export const BASE_PRICE_VND = 50000;
export const BASE_PRICE_USD = 2;
export const USD_TO_VND_RATE = 25800;
export type Currency = "VND" | "USD";
export type SubscriptionStatus = "active" | "due" | "grace" | "expired" | "none";
export interface StatusInfo {
  status: SubscriptionStatus;
  className: string;
  label: string;
  daysToEnd: number | null;
  daysPastEnd: number | null;
}
export function computeStatus(endDate: string | null): StatusInfo {
  const today = getTodayDateOnly();
  if (!endDate) {
    return {
      status: "none",
      className: "bg-gray-100 border-gray-400",
      label: "Chưa có thanh toán",
      daysToEnd: null,
      daysPastEnd: null,
    };
  }
  const daysToEnd = diffDaysDateOnly(endDate, today);
  const daysPastEnd = -daysToEnd;
  if (daysToEnd > DUE_SOON_DAYS) {
    return {
      status: "active",
      className: "bg-status-active border-status-active-border",
      label: "Còn hạn",
      daysToEnd,
      daysPastEnd: null,
    };
  }
  if (daysToEnd >= 0 && daysToEnd <= DUE_SOON_DAYS) {
    return {
      status: "due",
      className: "bg-status-due border-status-due-border",
      label: "Sắp đến hạn",
      daysToEnd,
      daysPastEnd: null,
    };
  }
  if (daysPastEnd > 0 && daysPastEnd <= GRACE_DAYS) {
    return {
      status: "grace",
      className: "bg-status-grace border-status-grace-border",
      label: "Quá hạn (cao su)",
      daysToEnd: null,
      daysPastEnd,
    };
  }
  return {
    status: "expired",
    className: "bg-status-expired border-status-expired-border",
    label: "Hết hạn",
    daysToEnd: null,
    daysPastEnd,
  };
}
export function calculateRecommendedMonths(
  amount: number,
  currency: Currency
): number {
  if (amount <= 0) return 1;
  const basePrice = currency === "VND" ? BASE_PRICE_VND : BASE_PRICE_USD;
  return Math.max(1, Math.floor(amount / basePrice));
}
```

## File: app/root.tsx
```typescript
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  Link,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import stylesheet from "~/tailwind.css?url";
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
];
function Document({
  children,
  title = "Kana Box V2",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <title>{title}</title>
      </head>
      <body className="min-h-full bg-zinc-50/50">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-sm font-bold text-white">K</span>
            </div>
            <span className="text-base font-semibold text-zinc-900">Kana Box</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
export default function App() {
  return (
    <Document>
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </Document>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();
  let message = "Đã xảy ra lỗi không mong muốn";
  let details = "";
  if (error instanceof Error) {
    message = error.message;
    details = error.stack || "";
  } else if (typeof error === "string") {
    message = error;
  } else if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    message = error.message;
  }
  return (
    <Document title="Lỗi - Kana Box V2">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900">Có lỗi xảy ra</h3>
                <p className="text-sm text-zinc-500">{message}</p>
              </div>
              {process.env.NODE_ENV === "development" && details && (
                <pre className="mt-4 text-xs overflow-auto bg-zinc-100 p-3 rounded-lg text-left text-zinc-600 max-h-48">
                  {details}
                </pre>
              )}
              <Button variant="outline" asChild>
                <Link to="/">Về trang chủ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </Document>
  );
}
```

## File: app/routes/_index.tsx
```typescript
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";
import { useState, useRef, useEffect } from "react";
import { Users, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import { listCustomers } from "~/models/customer.server";
import {
  computeStatus,
  listLatestPaymentsForAllCustomers,
} from "~/models/payment.server";
import { getTodayDateOnly } from "~/utils/date";
import CustomerTable from "~/components/CustomerTable";
import PublicLanguageSelect from "~/components/PublicLanguageSelect";
import { getPublicStrings, normalizePublicLang } from "~/i18n/public";
import { PageHeader, SearchField, StatCard } from "~/components/shared";
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const lang = data?.lang === "en" ? "en" : "vi";
  const strings = getPublicStrings(lang);
  return [{ title: `${strings.membersHeading} - Kana Box V2` }];
};
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q") || "";
  const lang = normalizePublicLang(url.searchParams.get("lang"));
  const strings = getPublicStrings(lang);
  const customers = await listCustomers(searchQuery, { publicOnly: false });
  const today = getTodayDateOnly();
  const latestPaymentsMap = await listLatestPaymentsForAllCustomers();
  const customersWithStatus = customers.map((customer) => {
    const latestPayment = latestPaymentsMap.get(customer._id.toString());
    const computedStatus = computeStatus(latestPayment?.endDate || null);
    const status = {
      ...computedStatus,
      label: strings.statusLabels[computedStatus.status],
    };
    const isHidden =
      customer.isPublicHidden ||
      (customer.renewalCancelled &&
        latestPayment?.endDate &&
        today > latestPayment.endDate);
    return {
      customer: {
        _id: customer._id.toString(),
        name: customer.displayName,
        note: customer.note,
      },
      latestPayment: latestPayment
        ? {
          _id: latestPayment._id.toString(),
          paidDate: latestPayment.paidDate,
          endDate: latestPayment.endDate,
          currency: latestPayment.currency,
          amount: latestPayment.amount,
          months: latestPayment.months,
          note: latestPayment.note,
        }
        : null,
      status,
      isHidden,
    };
  });
  const publicCustomers = customersWithStatus.filter((c) => !c.isHidden);
  const statusCounts = { active: 0, due: 0, grace: 0, expired: 0 };
  for (const c of publicCustomers) {
    const s = c.status.status;
    if (s in statusCounts) {
      statusCounts[s as keyof typeof statusCounts]++;
    }
  }
  return json({
    customers: publicCustomers,
    searchQuery,
    lang,
    statusCounts,
    totalCount: publicCustomers.length,
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
const statusCardConfig = [
  { key: "active", icon: CheckCircle, color: "text-emerald-600", dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-400" },
  { key: "due", icon: Clock, color: "text-amber-600", dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-400" },
  { key: "grace", icon: AlertTriangle, color: "text-orange-600", dot: "bg-orange-500", bg: "bg-orange-50", border: "border-orange-200", ring: "ring-orange-400" },
  { key: "expired", icon: XCircle, color: "text-red-600", dot: "bg-red-500", bg: "bg-red-50", border: "border-red-200", ring: "ring-red-400" },
] as const;
export default function PublicHome() {
  const { customers, lang, statusCounts, totalCount } = useLoaderData<typeof loader>();
  const strings = getPublicStrings(lang);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const filteredCustomers = customers.filter((item) => {
    const matchesSearch = item.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === null || item.status.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const trimmedSearch = searchTerm.trim();
  const isFilteredEmpty = customers.length > 0 && filteredCustomers.length === 0;
  const filteredEmptyTitle = trimmedSearch
    ? lang === "en"
      ? `No members match "${trimmedSearch}"`
      : `Không có thành viên khớp "${trimmedSearch}"`
    : lang === "en"
      ? "No members with this status"
      : "Không có thành viên ở trạng thái này";
  const filteredEmptySubtitle = lang === "en"
    ? "Try another search or status filter."
    : "Thử đổi từ khóa hoặc bộ lọc trạng thái.";
  return (
    <div className="space-y-6">
      <PageHeader
        title={strings.membersHeading}
        description={strings.membersCount(filteredCustomers.length)}
      >
        <PublicLanguageSelect
          lang={lang}
          label={strings.languageLabel}
          optionVi={strings.languageOptions.vi}
          optionEn={strings.languageOptions.en}
        />
      </PageHeader>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 shadow-sm">
        <span className="font-medium text-zinc-600">{strings.statusLegendLabel}</span>
        {statusCardConfig.map(({ key, dot }) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            {strings.statusLabels[key]}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={Users}
          label={strings.membersHeading}
          count={totalCount}
          color="text-indigo-500"
          bg="bg-white"
          border={statusFilter === null ? "border-indigo-300" : "border-zinc-200"}
          ring="ring-indigo-200"
          isSelected={statusFilter === null}
          onClick={() => setStatusFilter(null)}
        />
        {statusCardConfig.map(({ key, icon, color, bg, border, ring }) => (
          <StatCard
            key={key}
            icon={icon}
            label={strings.statusLabels[key]}
            count={statusCounts[key]}
            color={color}
            bg={bg}
            border={border}
            ring={ring}
            isSelected={statusFilter === key}
            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
          />
        ))}
      </div>
      <SearchField
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={lang === "en" ? "Search... (Ctrl+K)" : "Tìm kiếm... (Ctrl+K)"}
        className="max-w-xs"
        inputRef={searchInputRef}
      />
      <CustomerTable
        customers={filteredCustomers}
        basePath="/customers"
        i18n={strings.customerTable}
        isFilteredEmpty={isFilteredEmpty}
        filteredEmptyTitle={filteredEmptyTitle}
        filteredEmptySubtitle={filteredEmptySubtitle}
      />
    </div>
  );
}
```

## File: app/routes/826264._index.tsx
```typescript
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { defer, json } from "@remix-run/node";
import { Await, Link, useLoaderData } from "@remix-run/react";
import { Suspense, useState } from "react";
import { ObjectId } from "mongodb";
import {
  Ban,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { archiveCustomer, countCustomers, listCustomers } from "~/models/customer.server";
import {
  computeMonthlyTotals,
  computeStatus,
  listLatestPaymentsForAllCustomers,
  listPaymentsForRevenueWindow,
} from "~/models/payment.server";
import { getMonthBucket, getRevenueBucketRange, getTodayDateOnly } from "~/utils/date";
import AdminMemberList, {
  type AdminMemberWithStatus,
  type AdminStatusFilter,
} from "~/components/AdminMemberList";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { PageHeader, SearchField, StatCard } from "~/components/shared";
export const meta: MetaFunction = () => [
  { title: "Bảng điều khiển - Quản trị - Kana Box V2" },
];
interface MonthlyTotal {
  month: string;
  vnd: number;
  usd: number;
  convertedVnd: number;
}
function generateMonthBuckets(start: string, end: string): string[] {
  const buckets: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    buckets.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return buckets;
}
async function loadMonthlyTotals(): Promise<MonthlyTotal[]> {
  const fixedStartBucket = "2026-02";
  const today = getTodayDateOnly();
  const currentBucket = getMonthBucket(today);
  const monthBuckets = generateMonthBuckets(fixedStartBucket, currentBucket);
  const firstRange = getRevenueBucketRange(monthBuckets[0]);
  const lastRange = getRevenueBucketRange(monthBuckets[monthBuckets.length - 1]);
  const paymentsInWindow = await listPaymentsForRevenueWindow(
    firstRange.start,
    lastRange.end
  );
  const monthlyMap = computeMonthlyTotals(paymentsInWindow, monthBuckets);
  return monthBuckets.map((month) => {
    const totals = monthlyMap.get(month) || { VND: 0, USD: 0, convertedVnd: 0 };
    return {
      month,
      vnd: totals.VND,
      usd: totals.USD,
      convertedVnd: totals.convertedVnd,
    };
  });
}
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  if (intent === "archive") {
    const customerId = String(formData.get("customerId") || "");
    if (!customerId || !ObjectId.isValid(customerId)) {
      return json(
        { ok: false, error: "ID thành viên không hợp lệ" },
        { status: 400 }
      );
    }
    try {
      await archiveCustomer(customerId);
      return json({ ok: true, customerId });
    } catch (error) {
      console.error("Error archiving customer:", error);
      return json(
        { ok: false, error: "Lưu trữ thành viên thất bại. Vui lòng thử lại.", customerId },
        { status: 500 }
      );
    }
  }
  return json(
    { ok: false, error: "Thao tác không hợp lệ" },
    { status: 400 }
  );
}
export async function loader() {
  const monthlyTotals = loadMonthlyTotals();
  const [totalCustomers, customers, latestPaymentsMap] = await Promise.all([
    countCustomers(),
    listCustomers(),
    listLatestPaymentsForAllCustomers(),
  ]);
  const statusCounts = {
    active: 0,
    due: 0,
    grace: 0,
    expired: 0,
    none: 0,
    cancelledRenewal: 0,
  };
  const customersWithStatus: AdminMemberWithStatus[] = customers.map((customer) => {
    const latestPayment = latestPaymentsMap.get(customer._id.toString());
    const status = computeStatus(latestPayment?.endDate || null);
    statusCounts[status.status]++;
    if (customer.renewalCancelled) {
      statusCounts.cancelledRenewal++;
    }
    return {
      customer: {
        _id: customer._id.toString(),
        name: customer.displayName,
        note: customer.note,
        isPublicHidden: customer.isPublicHidden,
        renewalCancelled: customer.renewalCancelled || false,
        cancelledAt: customer.cancelledAt || null,
      },
      latestPayment: latestPayment
        ? {
          _id: latestPayment._id.toString(),
          paidDate: latestPayment.paidDate,
          endDate: latestPayment.endDate,
          currency: latestPayment.currency,
          amount: latestPayment.amount,
          months: latestPayment.months,
          note: latestPayment.note,
        }
        : null,
      status,
    };
  });
  return defer({
    totalCustomers,
    statusCounts,
    monthlyTotals,
    customers: customersWithStatus,
  });
}
const statusCards = [
  { key: "active" as const, label: "Còn hạn", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-400" },
  { key: "due" as const, label: "Sắp đến hạn", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-400" },
  { key: "grace" as const, label: "Quá hạn (cao su)", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", ring: "ring-orange-400" },
  { key: "expired" as const, label: "Hết hạn", icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", ring: "ring-red-400" },
];
const cancelledRenewalCard = {
  label: "Đã hủy gia hạn",
  icon: Ban,
  color: "text-orange-600",
  bg: "bg-orange-50",
  border: "border-orange-200",
  ring: "ring-orange-400",
};
function formatMonth(monthBucket: string): string {
  const [year, month] = monthBucket.split("-");
  return `Tháng ${parseInt(month, 10)}/${year}`;
}
function RevenueTable({ monthlyTotals }: { monthlyTotals: MonthlyTotal[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Tháng</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">VND</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">USD</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Tổng (quy đổi VND)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {monthlyTotals.map((month) => (
            <tr key={month.month} className="transition-colors hover:bg-zinc-50/50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900">{formatMonth(month.month)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-zinc-600">
                {month.vnd > 0 ? `${month.vnd.toLocaleString("vi-VN")} ₫` : <span className="text-zinc-300">—</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-zinc-600">
                {month.usd > 0 ? `$${month.usd.toFixed(2)}` : <span className="text-zinc-300">—</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums text-indigo-600">
                {month.convertedVnd > 0 ? `${month.convertedVnd.toLocaleString("vi-VN")} ₫` : <span className="text-zinc-300">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function RevenueSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 p-4">
      <div className="h-4 w-36 rounded bg-zinc-100" />
      <div className="h-4 w-full rounded bg-zinc-100" />
      <div className="h-4 w-5/6 rounded bg-zinc-100" />
    </div>
  );
}
export default function AdminDashboard() {
  const {
    totalCustomers,
    statusCounts,
    monthlyTotals,
    customers,
  } = useLoaderData<typeof loader>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>(null);
  const [cancelledOnly, setCancelledOnly] = useState(false);
  const filteredCustomers = customers.filter((item) => {
    const matchesSearch = item.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === null || item.status.status === statusFilter;
    const matchesCancelled = !cancelledOnly || item.customer.renewalCancelled === true;
    return matchesSearch && matchesStatus && matchesCancelled;
  });
  return (
    <div className="space-y-8">
      <PageHeader
        title="Bảng điều khiển"
        description="Quản lý đăng ký và xem báo cáo doanh thu"
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard
          icon={Users}
          label="Tổng thành viên"
          count={totalCustomers}
          color="text-indigo-500"
          bg="bg-white"
          border={statusFilter === null && !cancelledOnly ? "border-indigo-300" : "border-zinc-200"}
          ring="ring-indigo-200"
          isSelected={statusFilter === null && !cancelledOnly}
          onClick={() => {
            setStatusFilter(null);
            setCancelledOnly(false);
          }}
        />
        {statusCards.map(({ key, label, icon, color, bg, border, ring }) => (
          <StatCard
            key={key}
            icon={icon}
            label={label}
            count={statusCounts[key]}
            color={color}
            bg={bg}
            border={border}
            ring={ring}
            isSelected={statusFilter === key}
            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
          />
        ))}
        <StatCard
          icon={cancelledRenewalCard.icon}
          label={cancelledRenewalCard.label}
          count={statusCounts.cancelledRenewal}
          color={cancelledRenewalCard.color}
          bg={cancelledRenewalCard.bg}
          border={cancelledRenewalCard.border}
          ring={cancelledRenewalCard.ring}
          isSelected={cancelledOnly}
          onClick={() => setCancelledOnly((current) => !current)}
        />
      </div>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Thành viên
            <span className="ml-2 text-sm font-normal text-zinc-400">({filteredCustomers.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tìm kiếm..."
              className="w-full sm:w-48"
            />
            <Button asChild>
              <Link to="/826264/customers/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Thêm thành viên
              </Link>
            </Button>
          </div>
        </div>
        <AdminMemberList
          customers={filteredCustomers}
          totalCustomerCount={customers.length}
          basePath="/826264/customers"
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          cancelledOnly={cancelledOnly}
        />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            <div>
              <CardTitle className="text-base">Doanh thu theo tháng</CardTitle>
              <p className="mt-0.5 text-xs text-zinc-400">Chu kỳ ngày 6 → ngày 5 tháng sau</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<RevenueSkeleton />}>
            <Await
              resolve={monthlyTotals}
              errorElement={
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  Không thể tải dữ liệu doanh thu.
                </div>
              }
            >
              {(resolvedMonthlyTotals) => (
                <RevenueTable monthlyTotals={resolvedMonthlyTotals} />
              )}
            </Await>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
```

## File: app/routes/826264.customers.$customerId.edit.tsx
```typescript
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { redirect, json, useLoaderData, useActionData, Form, Link } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Breadcrumb,
  FormErrorBanner,
  FormMessage,
  FormActions,
} from "~/components/shared";
function isDuplicateDisplayNameError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}
export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: `Sửa ${data?.customer.displayName || "Thành viên"} - Quản trị - Kana Box V2`,
  },
];
interface ActionData {
  errors?: {
    displayName?: string;
    form?: string;
  };
  values?: {
    displayName: string;
    note: string;
  };
}
export async function loader({ params }: LoaderFunctionArgs) {
  const { ObjectId } = await import("mongodb");
  const { getCustomerById } = await import("../models/customer.server");
  const { customerId } = params;
  if (!customerId || !ObjectId.isValid(customerId)) {
    throw new Response("ID thành viên không hợp lệ", { status: 400 });
  }
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new Response("Không tìm thấy thành viên", { status: 404 });
  }
  return json({
    customer: {
      _id: customer._id.toString(),
      displayName: customer.displayName,
      note: customer.note,
    },
  });
}
export async function action({ request, params }: ActionFunctionArgs) {
  const { ObjectId } = await import("mongodb");
  const { updateCustomer } = await import("../models/customer.server");
  const { customerId } = params;
  if (!customerId || !ObjectId.isValid(customerId)) {
    throw new Response("ID thành viên không hợp lệ", { status: 400 });
  }
  const formData = await request.formData();
  const displayName = String(formData.get("name") || "");
  const noteInput = String(formData.get("note") || "");
  const displayNameTrimmed = displayName.trim();
  const noteTrimmed = noteInput.trim();
  const errors: ActionData["errors"] = {};
  if (!displayNameTrimmed) {
    errors.displayName = "Tên là bắt buộc";
  } else if (displayNameTrimmed.length > 60) {
    errors.displayName = "Tên tối đa 60 ký tự";
  }
  if (Object.keys(errors).length > 0) {
    return json<ActionData>(
      {
        errors,
        values: { displayName: displayNameTrimmed, note: noteTrimmed },
      },
      { status: 400 }
    );
  }
  try {
    const result = await updateCustomer(customerId, {
      displayName: displayNameTrimmed,
      note: noteTrimmed || undefined,
    });
    if (!result) {
      throw new Response("Không tìm thấy thành viên", { status: 404 });
    }
    return redirect(`/826264/customers/${customerId}`);
  } catch (error) {
    if (isDuplicateDisplayNameError(error)) {
      return json<ActionData>(
        {
          errors: { displayName: "Đã có thành viên với tên này" },
          values: { displayName: displayNameTrimmed, note: noteTrimmed },
        },
        { status: 400 }
      );
    }
    console.error("Error updating customer:", error);
    return json<ActionData>(
      {
        errors: { form: "Cập nhật thành viên thất bại. Vui lòng thử lại." },
        values: { displayName: displayNameTrimmed, note: noteTrimmed },
      },
      { status: 500 }
    );
  }
}
export default function AdminEditCustomer() {
  const { customer } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: customer.displayName, to: `/826264/customers/${customer._id}` },
        { label: "Sửa" },
      ]} />
      <Card>
        <CardHeader>
          <CardTitle>Sửa thành viên</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-5">
            {actionData?.errors?.form && (
              <FormErrorBanner message={actionData.errors.form} />
            )}
            <div className="space-y-2">
              <Label htmlFor="name">
                Tên <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                name="name"
                id="name"
                defaultValue={actionData?.values?.displayName || customer.displayName}
                className={actionData?.errors?.displayName ? "border-red-300 focus-visible:ring-red-500" : ""}
                placeholder="Tên thành viên"
                maxLength={60}
                required
              />
              <FormMessage
                error={actionData?.errors?.displayName}
                hint={actionData?.errors?.displayName ? undefined : "Phải duy nhất. 1–60 ký tự."}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                name="note"
                id="note"
                rows={4}
                defaultValue={actionData?.values?.note || customer.note || ""}
                placeholder="Ghi chú (tùy chọn) về thành viên..."
              />
            </div>
            <FormActions>
              <Button variant="outline" asChild>
                <Link to={`/826264/customers/${customer._id}`}>Hủy</Link>
              </Button>
              <Button type="submit">Lưu thay đổi</Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

## File: app/routes/826264.customers.$customerId.tsx
```typescript
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useFetcher, useLoaderData, useOutlet, Link, redirect, Form } from "@remix-run/react";
import { useState } from "react";
import { ObjectId } from "mongodb";
import {
  Pencil, CreditCard, Archive, Eye, EyeOff,
  RefreshCw, XCircle, StickyNote, Ban,
} from "lucide-react";
import {
  getCustomerById,
  hideCustomerFromPublic,
  unhideCustomer,
  archiveCustomer,
  cancelRenewal,
  resumeRenewal,
} from "~/models/customer.server";
import { listPaymentsForCustomer, voidPayment } from "~/models/payment.server";
import { computeStatus } from "~/models/subscriptionStatus";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { cn } from "~/lib/utils";
import {
  Breadcrumb,
  EmptyState,
  NoteBlock,
  formatCurrency,
  statusAccent,
} from "~/components/shared";
const statusVariant: Record<string, "active" | "due" | "grace" | "expired" | "none"> = {
  active: "active",
  due: "due",
  grace: "grace",
  expired: "expired",
  none: "none",
};
export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.customer.name || "Thành viên"} - Quản trị - Kana Box V2` },
];
export async function loader({ params }: LoaderFunctionArgs) {
  const { customerId } = params;
  if (!customerId || !ObjectId.isValid(customerId)) {
    throw new Response("ID thành viên không hợp lệ", { status: 400 });
  }
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new Response("Không tìm thấy thành viên", { status: 404 });
  }
  const payments = await listPaymentsForCustomer(customerId);
  const latestPayment = payments[0] || null;
  const status = computeStatus(latestPayment?.endDate || null);
  return json({
    customer: {
      _id: customer._id.toString(),
      name: customer.displayName,
      nameHistory: customer.nameHistory || [],
      note: customer.note,
      isPublicHidden: customer.isPublicHidden || false,
      renewalCancelled: customer.renewalCancelled || false,
      cancelledAt: customer.cancelledAt || null,
    },
    payments: payments.map((p) => ({
      _id: p._id.toString(),
      customerId: p.customerId.toString(),
      paidDate: p.paidDate,
      endDate: p.endDate,
      currency: p.currency,
      amount: p.amount,
      months: p.months,
      note: p.note,
    })),
    latestStatus: status,
  });
}
export async function action({ request, params }: ActionFunctionArgs) {
  const { customerId } = params;
  if (!customerId || !ObjectId.isValid(customerId)) {
    return json({ error: "Invalid customer ID" }, { status: 400 });
  }
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  if (intent === "hide") {
    await hideCustomerFromPublic(customerId);
    return redirect(`/826264/customers/${customerId}`);
  } else if (intent === "unhide") {
    await unhideCustomer(customerId);
    return redirect(`/826264/customers/${customerId}`);
  } else if (intent === "cancelRenewal") {
    await cancelRenewal(customerId);
    return redirect(`/826264/customers/${customerId}`);
  } else if (intent === "resumeRenewal") {
    await resumeRenewal(customerId);
    return redirect(`/826264/customers/${customerId}`);
  } else if (intent === "deleteCustomer") {
    await archiveCustomer(customerId);
    return redirect("/826264");
  } else if (intent === "deletePayment") {
    const paymentId = String(formData.get("paymentId") || "");
    if (paymentId && ObjectId.isValid(paymentId)) {
      await voidPayment(paymentId);
    }
    return redirect(`/826264/customers/${customerId}`);
  }
  return redirect(`/826264/customers/${customerId}`);
}
function PaymentActions({
  paymentId,
  editUrl,
  onVoid,
}: {
  paymentId: string;
  editUrl: string;
  onVoid: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
        <Link to={editUrl}>Sửa</Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={onVoid}
      >
        <Ban className="h-3 w-3 mr-1" />
        Hủy bỏ
      </Button>
    </div>
  );
}
export default function AdminCustomerDetail() {
  const outlet = useOutlet();
  const { customer, payments, latestStatus } = useLoaderData<typeof loader>();
  const [voidTarget, setVoidTarget] = useState<{ id: string; amount: string } | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const archiveFetcher = useFetcher<{ error?: string }>();
  if (outlet) {
    return outlet;
  }
  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Bảng điều khiển", to: "/826264" },
        { label: customer.name },
      ]} />
      <Card className={cn("border-l-[3px]", statusAccent[latestStatus.status] || "border-l-zinc-300")}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-xl">{customer.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant[latestStatus.status] || "none"}>{latestStatus.label}</Badge>
                {customer.isPublicHidden && <Badge variant="hidden">Ẩn khỏi công khai</Badge>}
                {customer.renewalCancelled && <Badge variant="cancelled">Đã hủy gia hạn</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Form method="post" className="contents">
                <input type="hidden" name="intent" value={customer.isPublicHidden ? "unhide" : "hide"} />
                <Button type="submit" variant="outline" size="sm">
                  {customer.isPublicHidden ? (
                    <><Eye className="h-3.5 w-3.5 mr-1.5" />Hiện công khai</>
                  ) : (
                    <><EyeOff className="h-3.5 w-3.5 mr-1.5" />Ẩn công khai</>
                  )}
                </Button>
              </Form>
              <Form method="post" className="contents">
                <input type="hidden" name="intent" value={customer.renewalCancelled ? "resumeRenewal" : "cancelRenewal"} />
                <Button type="submit" variant="outline" size="sm">
                  {customer.renewalCancelled ? (
                    <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Tiếp tục gia hạn</>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5 mr-1.5" />Hủy gia hạn</>
                  )}
                </Button>
              </Form>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/826264/customers/${customer._id}/edit`}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Sửa
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/826264/payments/new?customerId=${customer._id}`}>
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                  Thêm thanh toán
                </Link>
              </Button>
              <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setArchiveDialogOpen(true)}
                  >
                    <Archive className="h-3.5 w-3.5 mr-1.5" />
                    Lưu trữ
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Lưu trữ thành viên</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc muốn lưu trữ &quot;{customer.name}&quot;? Họ sẽ bị ẩn khỏi bảng nhưng dữ liệu thanh toán vẫn được giữ lại.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setArchiveDialogOpen(false)}>
                      Hủy
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                      disabled={archiveFetcher.state !== "idle"}
                      onClick={() => {
                        archiveFetcher.submit(
                          { intent: "deleteCustomer" },
                          { method: "post" }
                        );
                        setArchiveDialogOpen(false);
                      }}
                    >
                      {archiveFetcher.state !== "idle" ? "Đang lưu trữ..." : "Lưu trữ"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        {(customer.note || customer.nameHistory.length > 0) && (
          <CardContent className="space-y-3 pt-0">
            {customer.note && (
              <NoteBlock icon={StickyNote} label="Ghi chú" text={customer.note} />
            )}
            {customer.nameHistory.length > 0 && (
              <div className="rounded-lg bg-zinc-50 p-3">
                <p className="mb-2 text-xs font-medium text-zinc-500">Lịch sử đổi tên</p>
                <div className="space-y-1">
                  {customer.nameHistory.map((entry, index) => (
                    <p key={`${entry.name}-${entry.changedAt}-${index}`} className="text-xs text-zinc-600">
                      {entry.name} · {new Date(entry.changedAt).toLocaleDateString("vi-VN")}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lịch sử thanh toán</CardTitle>
            <span className="text-sm text-zinc-400">{payments.length} bản ghi</span>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} message="Chưa có lịch sử thanh toán">
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to={`/826264/payments/new?customerId=${customer._id}`}>Thêm thanh toán đầu tiên</Link>
              </Button>
            </EmptyState>
          ) : (
            <>
              <div className="hidden md:block">
                <div className="rounded-xl border border-zinc-200 overflow-hidden">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Ngày thanh toán</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Ngày hết hạn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Số tiền</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Số tháng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {payments.map((payment, index) => {
                        const paymentStatus = computeStatus(payment.endDate);
                        const isLatest = index === 0;
                        return (
                          <tr key={payment._id} className={cn("transition-colors hover:bg-zinc-50/50", isLatest && "bg-indigo-50/30")}>
                            <td className="px-4 py-3 text-sm text-zinc-900 tabular-nums">{payment.paidDate}</td>
                            <td className="px-4 py-3 text-sm text-zinc-900 tabular-nums">{payment.endDate}</td>
                            <td className="px-4 py-3 text-sm font-medium text-zinc-900 tabular-nums">
                              {formatCurrency(payment.amount, payment.currency)}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-500 tabular-nums">{payment.months}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant={statusVariant[paymentStatus.status] || "none"}>{paymentStatus.label}</Badge>
                                {isLatest && <Badge variant="info">hiện tại</Badge>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <PaymentActions
                                paymentId={payment._id}
                                editUrl={`/826264/payments/${payment._id}/edit`}
                                onVoid={() => setVoidTarget({
                                  id: payment._id,
                                  amount: formatCurrency(payment.amount, payment.currency),
                                })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="md:hidden space-y-2">
                {payments.map((payment, index) => {
                  const paymentStatus = computeStatus(payment.endDate);
                  const isLatest = index === 0;
                  return (
                    <div key={payment._id} className={cn("rounded-xl border p-4", isLatest ? "border-indigo-200 bg-indigo-50/20" : "border-zinc-200")}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant[paymentStatus.status] || "none"}>{paymentStatus.label}</Badge>
                          {isLatest && <Badge variant="info">hiện tại</Badge>}
                        </div>
                        <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                          {formatCurrency(payment.amount, payment.currency)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 text-xs text-zinc-500 mb-3">
                        <div>Thanh toán: <span className="text-zinc-700 font-medium tabular-nums">{payment.paidDate}</span></div>
                        <div>Hết hạn: <span className="text-zinc-700 font-medium tabular-nums">{payment.endDate}</span></div>
                        <div>Số tháng: <span className="text-zinc-700 font-medium">{payment.months}</span></div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                        <PaymentActions
                          paymentId={payment._id}
                          editUrl={`/826264/payments/${payment._id}/edit`}
                          onVoid={() => setVoidTarget({
                            id: payment._id,
                            amount: formatCurrency(payment.amount, payment.currency),
                          })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={!!voidTarget} onOpenChange={(open) => { if (!open) setVoidTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy bỏ thanh toán</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy bỏ thanh toán {voidTarget?.amount}? Dữ liệu sẽ được giữ lại nhưng không còn tính vào báo cáo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Form method="post" className="contents" onSubmit={() => setVoidTarget(null)}>
              <input type="hidden" name="intent" value="deletePayment" />
              <input type="hidden" name="paymentId" value={voidTarget?.id || ""} />
              <AlertDialogAction type="submit" className="bg-red-600 hover:bg-red-700">
                Hủy bỏ thanh toán
              </AlertDialogAction>
            </Form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

## File: app/routes/826264.customers.archived.tsx
```typescript
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { ObjectId } from "mongodb";
import { Archive, RefreshCw } from "lucide-react";
import { getCustomerById, listCustomers, unarchiveCustomer } from "~/models/customer.server";
import { createPayment, listLatestPaymentsForAllCustomers } from "~/models/payment.server";
import {
  BASE_PRICE_USD,
  BASE_PRICE_VND,
  calculateRecommendedMonths,
  computeStatus,
  type Currency,
} from "~/models/subscriptionStatus";
import { getTodayDateOnly } from "~/utils/date";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  AmountPresetChips,
  Breadcrumb,
  CurrencyAmountInput,
  CurrencySelect,
  EmptyState,
  FormErrorBanner,
  FormMessage,
  MonthsRecommendation,
  PageHeader,
  formatCurrency,
} from "~/components/shared";
import { cn } from "~/lib/utils";
export const meta: MetaFunction = () => [
  { title: "Thành viên lưu trữ - Quản trị - Kana Box V2" },
];
const statusVariant: Record<string, "active" | "due" | "grace" | "expired" | "none"> = {
  active: "active",
  due: "due",
  grace: "grace",
  expired: "expired",
  none: "none",
};
function serializeArchivedAt(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
interface ActionData {
  error?: string;
  errors?: {
    customerId?: string;
    amount?: string;
    months?: string;
    paidDate?: string;
    form?: string;
  };
  values?: {
    customerId: string;
    currency: string;
    amount: string;
    months: string;
    paidDate: string;
    note: string;
  };
  recommendedMonths?: number;
}
export async function loader({}: LoaderFunctionArgs) {
  const [customers, latestPaymentsMap] = await Promise.all([
    listCustomers(undefined, { includeArchived: true }),
    listLatestPaymentsForAllCustomers(),
  ]);
  const archivedCustomers = customers
    .filter((customer) => customer.isArchived)
    .map((customer) => {
      const latestPayment = latestPaymentsMap.get(customer._id.toString());
      return {
        customer: {
          _id: customer._id.toString(),
          name: customer.displayName,
          note: customer.note,
          archivedAt: serializeArchivedAt(customer.archivedAt),
        },
        latestPayment: latestPayment
          ? {
            _id: latestPayment._id.toString(),
            paidDate: latestPayment.paidDate,
            endDate: latestPayment.endDate,
            currency: latestPayment.currency,
            amount: latestPayment.amount,
            months: latestPayment.months,
            note: latestPayment.note,
          }
          : null,
        status: computeStatus(latestPayment?.endDate || null),
      };
    });
  return json({ customers: archivedCustomers });
}
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const customerId = String(formData.get("customerId") || "");
  if (intent !== "unarchive" && intent !== "unarchiveWithPayment") {
    return json<ActionData>({ error: "Thao tác không hợp lệ" }, { status: 400 });
  }
  if (!customerId || !ObjectId.isValid(customerId)) {
    return json<ActionData>({ error: "ID thành viên không hợp lệ" }, { status: 400 });
  }
  if (intent === "unarchive") {
    try {
      await unarchiveCustomer(customerId);
      return redirect("/826264/customers/archived");
    } catch (error) {
      console.error("Error restoring archived customer:", error);
      return json<ActionData>(
        { error: "Khôi phục thành viên thất bại. Vui lòng kiểm tra tên trùng và thử lại." },
        { status: 500 }
      );
    }
  }
  const currencyRaw = String(formData.get("currency") || "VND");
  const currency: Currency = currencyRaw === "USD" ? "USD" : "VND";
  const amountStr = String(formData.get("amount") || "").trim();
  const monthsStr = String(formData.get("months") || "").trim();
  const paidDate = String(formData.get("paidDate") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const errors: ActionData["errors"] = {};
  const customer = await getCustomerById(customerId);
  if (!customer) {
    errors.customerId = "Không tìm thấy thành viên";
  }
  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount <= 0) {
    errors.amount = "Số tiền phải là số dương";
  } else if (currency === "VND" && !Number.isInteger(amount)) {
    errors.amount = "Số tiền VND phải là số nguyên (không có phần thập phân)";
  }
  const months = parseInt(monthsStr, 10);
  if (!monthsStr || isNaN(months) || months < 1) {
    errors.months = "Số tháng tối thiểu là 1";
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!paidDate || !dateRegex.test(paidDate)) {
    errors.paidDate = "Vui lòng nhập ngày hợp lệ (YYYY-MM-DD)";
  }
  const recommendedMonths =
    amount > 0 && !isNaN(amount)
      ? calculateRecommendedMonths(amount, currency)
      : 1;
  const values = {
    customerId,
    currency,
    amount: amountStr,
    months: monthsStr,
    paidDate,
    note,
  };
  if (Object.keys(errors).length > 0) {
    return json<ActionData>(
      { errors, values, recommendedMonths },
      { status: 400 }
    );
  }
  try {
    await unarchiveCustomer(customerId, note || undefined);
    await createPayment({
      customerId,
      paidDate,
      currency,
      amount,
      months,
      note: note || undefined,
    });
    return redirect(`/826264/customers/${customerId}`);
  } catch (error) {
    console.error("Error restoring archived customer with payment:", error);
    return json<ActionData>(
      {
        errors: {
          form: "Khôi phục và tạo thanh toán thất bại. Vui lòng thử lại.",
        },
        values,
        recommendedMonths,
      },
      { status: 500 }
    );
  }
}
function formatArchivedAt(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("vi-VN");
}
type RestoreTarget = {
  id: string;
  name: string;
};
function getRestoreTargetById(
  customers: Array<{ customer: { _id: string; name: string } }>,
  customerId: string | undefined
): RestoreTarget | null {
  if (!customerId) {
    return null;
  }
  const match = customers.find((item) => item.customer._id === customerId);
  return match ? { id: match.customer._id, name: match.customer.name } : null;
}
function isCurrency(value: string | undefined): value is Currency {
  return value === "VND" || value === "USD";
}
function getInitialAmount(currency: Currency, rawAmount?: string): number {
  const parsed = rawAmount ? parseFloat(rawAmount) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return currency === "USD" ? BASE_PRICE_USD : BASE_PRICE_VND;
}
function RestoreActions({
  customer,
  onRestoreWithPayment,
}: {
  customer: RestoreTarget;
  onRestoreWithPayment: (target: RestoreTarget) => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      className="w-full sm:w-auto"
      onClick={() => onRestoreWithPayment(customer)}
    >
      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
      Khôi phục
    </Button>
  );
}
function RestoreWithPaymentDialog({
  target,
  actionData,
  onOpenChange,
}: {
  target: RestoreTarget | null;
  actionData: ActionData | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const navigation = useNavigation();
  const actionValues = actionData?.values;
  const targetValues = target && actionValues?.customerId === target.id
    ? actionValues
    : undefined;
  const fieldErrors = targetValues ? actionData?.errors : undefined;
  const initialCurrency = isCurrency(targetValues?.currency) ? targetValues.currency : "VND";
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [amount, setAmount] = useState(() => getInitialAmount(initialCurrency, targetValues?.amount));
  const [monthsManuallyEdited, setMonthsManuallyEdited] = useState(false);
  const recommendedMonths = calculateRecommendedMonths(amount, currency);
  const [months, setMonths] = useState(
    parseInt(targetValues?.months || String(recommendedMonths), 10) || 1
  );
  const isSubmitting =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "unarchiveWithPayment";
  useEffect(() => {
    if (!target) {
      return;
    }
    const nextCurrency = isCurrency(targetValues?.currency) ? targetValues.currency : "VND";
    const nextAmount = getInitialAmount(nextCurrency, targetValues?.amount);
    const nextRecommendedMonths = calculateRecommendedMonths(nextAmount, nextCurrency);
    setCurrency(nextCurrency);
    setAmount(nextAmount);
    setMonths(parseInt(targetValues?.months || String(nextRecommendedMonths), 10) || 1);
    setMonthsManuallyEdited(false);
  }, [target, targetValues?.amount, targetValues?.currency, targetValues?.months]);
  const handleAmountPreset = (preset: number) => {
    setAmount(preset);
    if (!monthsManuallyEdited) {
      setMonths(calculateRecommendedMonths(preset, currency));
    }
  };
  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Khôi phục thành viên</AlertDialogTitle>
          <AlertDialogDescription>
            Tạo thanh toán mới khi khôi phục &quot;{target?.name}&quot;.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="unarchiveWithPayment" />
          <input type="hidden" name="customerId" value={target?.id || ""} />
          {fieldErrors?.form && <FormErrorBanner message={fieldErrors.form} />}
          <FormMessage error={fieldErrors?.customerId} />
          <div className="space-y-2">
            <Label htmlFor="restoreCurrency">
              Tiền tệ <span className="text-red-500">*</span>
            </Label>
            <CurrencySelect
              name="currency"
              id="restoreCurrency"
              value={currency}
              onChange={setCurrency}
            />
            <FormMessage hint={`Giá cơ bản: ${BASE_PRICE_VND.toLocaleString("vi-VN")} ₫/tháng hoặc $${BASE_PRICE_USD}/tháng`} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restoreAmount">
              Số tiền <span className="text-red-500">*</span>
            </Label>
            {currency === "VND" && (
              <AmountPresetChips currentAmount={amount} onSelect={handleAmountPreset} />
            )}
            <CurrencyAmountInput
              currency={currency}
              name="amount"
              id="restoreAmount"
              value={amount || ""}
              onChange={(event) => {
                const nextAmount = parseFloat(event.target.value) || 0;
                setAmount(nextAmount);
                if (!monthsManuallyEdited) {
                  setMonths(calculateRecommendedMonths(nextAmount, currency));
                }
              }}
              error={!!fieldErrors?.amount}
            />
            <FormMessage error={fieldErrors?.amount} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restoreMonths">
              Số tháng <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              name="months"
              id="restoreMonths"
              min="1"
              step="1"
              value={months}
              onChange={(event) => {
                const nextMonths = parseInt(event.target.value, 10) || 1;
                setMonths(nextMonths);
                setMonthsManuallyEdited(true);
              }}
              className={fieldErrors?.months ? "border-red-300 focus-visible:ring-red-500" : ""}
              required
            />
            <MonthsRecommendation months={recommendedMonths} />
            <FormMessage error={fieldErrors?.months} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restorePaidDate">
              Ngày thanh toán <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              name="paidDate"
              id="restorePaidDate"
              defaultValue={targetValues?.paidDate || getTodayDateOnly()}
              className={fieldErrors?.paidDate ? "border-red-300 focus-visible:ring-red-500" : ""}
              required
            />
            <FormMessage
              error={fieldErrors?.paidDate}
              hint={fieldErrors?.paidDate ? undefined : "Ngày hết hạn = ngày thanh toán + số tháng (theo lịch)"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restoreNote">Ghi chú</Label>
            <Textarea
              name="note"
              id="restoreNote"
              rows={3}
              defaultValue={targetValues?.note || ""}
              placeholder="Ghi chú (tùy chọn) về lần khôi phục..."
            />
          </div>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel type="button">Hủy</AlertDialogCancel>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Khôi phục và tạo thanh toán"}
            </Button>
          </AlertDialogFooter>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export default function ArchivedCustomers() {
  const { customers } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [restoreTarget, setRestoreTarget] = useState<RestoreTarget | null>(() =>
    getRestoreTargetById(customers, actionData?.values?.customerId)
  );
  useEffect(() => {
    const nextTarget = getRestoreTargetById(customers, actionData?.values?.customerId);
    if (nextTarget && actionData?.errors) {
      setRestoreTarget(nextTarget);
    }
  }, [actionData?.errors, actionData?.values?.customerId, customers]);
  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Bảng điều khiển", to: "/826264" },
        { label: "Thành viên lưu trữ" },
      ]} />
      <PageHeader
        title="Thành viên lưu trữ"
        description={`${customers.length} thành viên đang được lưu trữ`}
      >
        <Button variant="outline" asChild>
          <Link to="/826264">Về bảng điều khiển</Link>
        </Button>
      </PageHeader>
      {actionData?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionData.error}
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <EmptyState icon={Archive} message="Chưa có thành viên lưu trữ" />
          ) : (
            <>
              <div className="hidden md:block">
                <div className="overflow-hidden rounded-xl">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Tên</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Ngày lưu trữ</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Trạng thái</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Ngày hết hạn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Thanh toán gần nhất</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {customers.map(({ customer, latestPayment, status }) => (
                        <tr key={customer._id} className="transition-colors hover:bg-zinc-50/50">
                          <td className="px-4 py-3 text-sm">
                            <div>
                              <p className="font-medium text-zinc-900">{customer.name}</p>
                              {customer.note && (
                                <p className="mt-0.5 text-xs text-zinc-400">{customer.note}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-zinc-600">
                            {formatArchivedAt(customer.archivedAt)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {latestPayment ? (
                              <span className={cn("tabular-nums", status.status === "expired" && "font-medium text-red-600")}>
                                {latestPayment.endDate}
                              </span>
                            ) : (
                              <span className="text-zinc-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-zinc-700">
                            {latestPayment ? formatCurrency(latestPayment.amount, latestPayment.currency) : (
                              <span className="text-zinc-300">Chưa có thanh toán</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <RestoreActions
                              customer={{ id: customer._id, name: customer.name }}
                              onRestoreWithPayment={setRestoreTarget}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-2 p-4 md:hidden">
                {customers.map(({ customer, latestPayment, status }) => (
                  <div key={customer._id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">{customer.name}</p>
                        {customer.note && (
                          <p className="mt-1 text-xs text-zinc-400">{customer.note}</p>
                        )}
                      </div>
                      <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                      <div>
                        <span className="text-zinc-400">Lưu trữ:</span>{" "}
                        <span className="font-medium text-zinc-700">{formatArchivedAt(customer.archivedAt)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Hết hạn:</span>{" "}
                        {latestPayment ? (
                          <span className={cn("font-medium", status.status === "expired" ? "text-red-600" : "text-zinc-700")}>
                            {latestPayment.endDate}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-zinc-400">Thanh toán:</span>{" "}
                        {latestPayment ? (
                          <span className="font-medium text-zinc-700">
                            {formatCurrency(latestPayment.amount, latestPayment.currency)}
                          </span>
                        ) : (
                          <span className="text-zinc-300">Chưa có thanh toán</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <RestoreActions
                        customer={{ id: customer._id, name: customer.name }}
                        onRestoreWithPayment={setRestoreTarget}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <RestoreWithPaymentDialog
        target={restoreTarget}
        actionData={actionData}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreTarget(null);
          }
        }}
      />
    </div>
  );
}
```

## File: app/routes/826264.customers.new.tsx
```typescript
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, json, useActionData, Form, Link } from "@remix-run/react";
import { useState } from "react";
import {
  createCustomer,
  findArchivedByName,
  unarchiveCustomer,
  customerExistsByDisplayName,
} from "~/models/customer.server";
import { createPayment } from "~/models/payment.server";
import {
  calculateRecommendedMonths,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
} from "~/models/subscriptionStatus";
import { getTodayDateOnly } from "~/utils/date";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  Breadcrumb,
  FormErrorBanner,
  FormMessage,
  FormActions,
  CurrencySelect,
  AmountPresetChips,
  CurrencyAmountInput,
  MonthsRecommendation,
} from "~/components/shared";
export const meta: MetaFunction = () => [
  { title: "Thêm thành viên - Quản trị - Kana Box V2" },
];
interface ActionData {
  errors?: {
    displayName?: string;
    amount?: string;
    months?: string;
    paidDate?: string;
    form?: string;
  };
  values?: {
    displayName: string;
    note: string;
    currency: string;
    amount: string;
    months: string;
    paidDate: string;
    paymentNote: string;
  };
  recommendedMonths?: number;
}
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const displayName = String(formData.get("name") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const currency = String(formData.get("currency") || "VND") as "VND" | "USD";
  const amountStr = String(formData.get("amount") || "").trim();
  const monthsStr = String(formData.get("months") || "").trim();
  const paidDate = String(formData.get("paidDate") || "").trim();
  const paymentNote = String(formData.get("paymentNote") || "").trim();
  const errors: ActionData["errors"] = {};
  if (!displayName) {
    errors.displayName = "Tên là bắt buộc";
  } else if (displayName.length < 1) {
    errors.displayName = "Tên tối thiểu 1 ký tự";
  } else if (displayName.length > 60) {
    errors.displayName = "Tên tối đa 60 ký tự";
  }
  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount <= 0) {
    errors.amount = "Số tiền phải là số dương";
  } else if (currency === "VND" && !Number.isInteger(amount)) {
    errors.amount = "Số tiền VND phải là số nguyên (không có phần thập phân)";
  }
  const months = parseInt(monthsStr, 10);
  if (!monthsStr || isNaN(months) || months < 1) {
    errors.months = "Số tháng tối thiểu là 1";
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!paidDate || !dateRegex.test(paidDate)) {
    errors.paidDate = "Vui lòng nhập ngày hợp lệ (YYYY-MM-DD)";
  }
  const recommendedMonths =
    amount > 0 && !isNaN(amount)
      ? calculateRecommendedMonths(amount, currency)
      : 1;
  if (Object.keys(errors).length > 0) {
    return json<ActionData>(
      {
        errors,
        values: {
          displayName,
          note,
          currency,
          amount: amountStr,
          months: monthsStr,
          paidDate,
          paymentNote,
        },
        recommendedMonths,
      },
      { status: 400 }
    );
  }
  try {
    const archived = await findArchivedByName(displayName);
    if (archived) {
      const customerId = archived._id.toString();
      await unarchiveCustomer(customerId, note || undefined);
      await createPayment({
        customerId,
        paidDate,
        currency,
        amount,
        months,
        note: paymentNote || undefined,
      });
      return redirect(`/826264/customers/${customerId}`);
    }
    const activeExists = await customerExistsByDisplayName(displayName);
    if (activeExists) {
      return json<ActionData>(
        {
          errors: {
            displayName: "Đã có thành viên với tên này",
          },
          values: {
            displayName,
            note,
            currency,
            amount: amountStr,
            months: monthsStr,
            paidDate,
            paymentNote,
          },
          recommendedMonths,
        },
        { status: 400 }
      );
    }
    const customer = await createCustomer({ displayName, note: note || undefined });
    const customerId = customer._id.toString();
    await createPayment({
      customerId,
      paidDate,
      currency,
      amount,
      months,
      note: paymentNote || undefined,
    });
    return redirect(`/826264/customers/${customerId}`);
  } catch (error) {
    console.error("Error creating customer/payment:", error);
    return json<ActionData>(
      {
        errors: {
          form: "Tạo thành viên thất bại. Vui lòng thử lại.",
        },
        values: {
          displayName,
          note,
          currency,
          amount: amountStr,
          months: monthsStr,
          paidDate,
          paymentNote,
        },
        recommendedMonths,
      },
      { status: 500 }
    );
  }
}
export default function AdminAddCustomer() {
  const actionData = useActionData<ActionData>();
  const initialCurrency = (actionData?.values?.currency as "VND" | "USD") || "VND";
  const [currency, setCurrency] = useState<"VND" | "USD">(initialCurrency);
  const [amount, setAmount] = useState(() => {
    const parsed = actionData?.values?.amount
      ? parseFloat(actionData.values.amount)
      : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return initialCurrency === "USD" ? BASE_PRICE_USD : 50000;
  });
  const [monthsManuallyEdited, setMonthsManuallyEdited] = useState(false);
  const recommendedMonths = calculateRecommendedMonths(amount, currency);
  const [months, setMonths] = useState(
    parseInt(
      actionData?.values?.months || String(recommendedMonths) || "1",
      10
    ) || 1
  );
  const handleAmountPreset = (preset: number) => {
    setAmount(preset);
    if (!monthsManuallyEdited) {
      setMonths(calculateRecommendedMonths(preset, currency));
    }
  };
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: "Bảng điều khiển", to: "/826264" },
        { label: "Thêm thành viên" },
      ]} />
      <Card>
        <CardHeader>
          <CardTitle>Thêm thành viên mới</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">Tạo thành viên kèm thanh toán ban đầu</p>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-5">
            {actionData?.errors?.form && (
              <FormErrorBanner message={actionData.errors.form} />
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Tên thành viên <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  name="name"
                  id="name"
                  defaultValue={actionData?.values?.displayName || ""}
                  className={actionData?.errors?.displayName ? "border-red-300 focus-visible:ring-red-500" : ""}
                  placeholder="Tên thành viên"
                  maxLength={60}
                  required
                />
                <FormMessage
                  error={actionData?.errors?.displayName}
                  hint={actionData?.errors?.displayName ? undefined : "Phải duy nhất. 1–60 ký tự."}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Ghi chú thành viên</Label>
                <Textarea
                  name="note"
                  id="note"
                  rows={2}
                  defaultValue={actionData?.values?.note || ""}
                  placeholder="Ghi chú (tùy chọn) về thành viên..."
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900">Thanh toán ban đầu</h3>
              <div className="space-y-2">
                <Label htmlFor="currency">
                  Tiền tệ <span className="text-red-500">*</span>
                </Label>
                <CurrencySelect
                  name="currency"
                  id="currency"
                  value={currency}
                  onChange={setCurrency}
                />
                <FormMessage hint={`Giá cơ bản: ${BASE_PRICE_VND.toLocaleString("vi-VN")} ₫/tháng hoặc $${BASE_PRICE_USD}/tháng`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Số tiền <span className="text-red-500">*</span>
                </Label>
                {currency === "VND" && (
                  <AmountPresetChips currentAmount={amount} onSelect={handleAmountPreset} />
                )}
                <CurrencyAmountInput
                  currency={currency}
                  name="amount"
                  id="amount"
                  value={amount || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setAmount(val);
                    if (!monthsManuallyEdited) {
                      setMonths(calculateRecommendedMonths(val, currency));
                    }
                  }}
                  error={!!actionData?.errors?.amount}
                />
                <FormMessage error={actionData?.errors?.amount} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="months">
                  Số tháng <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  name="months"
                  id="months"
                  min="1"
                  step="1"
                  value={months}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setMonths(val);
                    setMonthsManuallyEdited(true);
                  }}
                  className={actionData?.errors?.months ? "border-red-300 focus-visible:ring-red-500" : ""}
                  required
                />
                <MonthsRecommendation months={recommendedMonths} />
                <FormMessage error={actionData?.errors?.months} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidDate">
                  Ngày thanh toán <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  name="paidDate"
                  id="paidDate"
                  defaultValue={actionData?.values?.paidDate || getTodayDateOnly()}
                  className={actionData?.errors?.paidDate ? "border-red-300 focus-visible:ring-red-500" : ""}
                  required
                />
                <FormMessage
                  error={actionData?.errors?.paidDate}
                  hint={actionData?.errors?.paidDate ? undefined : "Hết hạn = ngày thanh toán + số tháng (theo lịch)"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentNote">Ghi chú thanh toán</Label>
                <Textarea
                  name="paymentNote"
                  id="paymentNote"
                  rows={2}
                  defaultValue={actionData?.values?.paymentNote || ""}
                  placeholder="Ghi chú (tùy chọn) về thanh toán..."
                />
              </div>
            </div>
            <Separator />
            <FormActions>
              <Button variant="outline" asChild>
                <Link to="/826264">Hủy</Link>
              </Button>
              <Button type="submit">Tạo thành viên và thanh toán</Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

## File: app/routes/826264.payments.$paymentId.edit.tsx
```typescript
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { redirect, json, useLoaderData, useActionData, Form, Link } from "@remix-run/react";
import { useState } from "react";
import { ObjectId } from "mongodb";
import { getPaymentById, updatePayment } from "~/models/payment.server";
import { getCustomerById } from "~/models/customer.server";
import {
  calculateRecommendedMonths,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
} from "~/models/subscriptionStatus";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Breadcrumb,
  FormErrorBanner,
  FormMessage,
  FormActions,
  CurrencySelect,
  AmountPresetChips,
  CurrencyAmountInput,
  MonthsRecommendation,
} from "~/components/shared";
export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `Sửa thanh toán - ${data?.customer.name || "Thành viên"} - Quản trị - Kana Box V2` },
];
interface LoaderData {
  payment: {
    _id: string;
    customerId: string;
    paidDate: string;
    currency: "VND" | "USD";
    amount: number;
    months: number;
    note?: string;
  };
  customer: {
    _id: string;
    name: string;
  };
}
interface ActionData {
  errors?: {
    amount?: string;
    months?: string;
    paidDate?: string;
    form?: string;
  };
  values?: {
    currency: string;
    amount: string;
    months: string;
    paidDate: string;
    note: string;
  };
  recommendedMonths?: number;
}
export async function loader({ params }: LoaderFunctionArgs) {
  const { paymentId } = params;
  if (!paymentId || !ObjectId.isValid(paymentId)) {
    throw new Response("ID thanh toán không hợp lệ", { status: 400 });
  }
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    throw new Response("Không tìm thấy thanh toán", { status: 404 });
  }
  const customer = await getCustomerById(payment.customerId.toString());
  if (!customer) {
    throw new Response("Không tìm thấy thành viên", { status: 404 });
  }
  return json<LoaderData>({
    payment: {
      _id: payment._id.toString(),
      customerId: payment.customerId.toString(),
      paidDate: payment.paidDate,
      currency: payment.currency,
      amount: payment.amount,
      months: payment.months,
      note: payment.note,
    },
    customer: {
      _id: customer._id.toString(),
      name: customer.displayName,
    },
  });
}
export async function action({ request, params }: ActionFunctionArgs) {
  const { paymentId } = params;
  if (!paymentId || !ObjectId.isValid(paymentId)) {
    throw new Response("ID thanh toán không hợp lệ", { status: 400 });
  }
  const formData = await request.formData();
  const currency = String(formData.get("currency") || "VND") as "VND" | "USD";
  const amountStr = String(formData.get("amount") || "").trim();
  const monthsStr = String(formData.get("months") || "").trim();
  const paidDate = String(formData.get("paidDate") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const errors: ActionData["errors"] = {};
  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount <= 0) {
    errors.amount = "Số tiền phải là số dương";
  } else if (currency === "VND" && !Number.isInteger(amount)) {
    errors.amount = "Số tiền VND phải là số nguyên (không có phần thập phân)";
  }
  const months = parseInt(monthsStr, 10);
  if (!monthsStr || isNaN(months) || months < 1) {
    errors.months = "Số tháng tối thiểu là 1";
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!paidDate || !dateRegex.test(paidDate)) {
    errors.paidDate = "Vui lòng nhập ngày hợp lệ (YYYY-MM-DD)";
  }
  const recommendedMonths =
    amount > 0 && !isNaN(amount)
      ? calculateRecommendedMonths(amount, currency)
      : 1;
  if (Object.keys(errors).length > 0) {
    return json<ActionData>(
      {
        errors,
        values: {
          currency,
          amount: amountStr,
          months: monthsStr,
          paidDate,
          note,
        },
        recommendedMonths,
      },
      { status: 400 }
    );
  }
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    return json<ActionData>(
      { errors: { form: "Không tìm thấy thanh toán" }, values: { currency, amount: amountStr, months: monthsStr, paidDate, note } },
      { status: 404 }
    );
  }
  try {
    await updatePayment({
      id: paymentId,
      paidDate,
      currency,
      amount,
      months,
      note: note || undefined,
    });
    return redirect(`/826264/customers/${payment.customerId.toString()}`);
  } catch (error) {
    console.error("Error updating payment:", error);
    return json<ActionData>(
      {
        errors: { form: "Cập nhật thanh toán thất bại. Vui lòng thử lại." },
        values: { currency, amount: amountStr, months: monthsStr, paidDate, note },
        recommendedMonths,
      },
      { status: 500 }
    );
  }
}
export default function AdminEditPayment() {
  const { payment, customer } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [currency, setCurrency] = useState<"VND" | "USD">(
    (actionData?.values?.currency as "VND" | "USD") || payment.currency
  );
  const [amount, setAmount] = useState(
    parseFloat(actionData?.values?.amount || String(payment.amount)) || 0
  );
  const [monthsManuallyEdited, setMonthsManuallyEdited] = useState(false);
  const recommendedMonths = calculateRecommendedMonths(amount, currency);
  const [months, setMonths] = useState(
    parseInt(
      actionData?.values?.months || String(payment.months),
      10
    ) || 1
  );
  const handleAmountPreset = (preset: number) => {
    setAmount(preset);
    if (!monthsManuallyEdited) {
      setMonths(calculateRecommendedMonths(preset, currency));
    }
  };
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: customer.name, to: `/826264/customers/${customer._id}` },
        { label: "Sửa thanh toán" },
      ]} />
      <Card>
        <CardHeader>
          <CardTitle>Sửa thanh toán</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">Thành viên: {customer.name}</p>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-5">
            {actionData?.errors?.form && (
              <FormErrorBanner message={actionData.errors.form} />
            )}
            <div className="space-y-2">
              <Label htmlFor="currency">
                Tiền tệ <span className="text-red-500">*</span>
              </Label>
              <CurrencySelect
                name="currency"
                id="currency"
                value={currency}
                onChange={setCurrency}
              />
              <FormMessage hint={`Giá cơ bản: ${BASE_PRICE_VND.toLocaleString("vi-VN")} ₫/tháng hoặc $${BASE_PRICE_USD}/tháng`} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">
                Số tiền <span className="text-red-500">*</span>
              </Label>
              {currency === "VND" && (
                <AmountPresetChips currentAmount={amount} onSelect={handleAmountPreset} />
              )}
              <CurrencyAmountInput
                currency={currency}
                name="amount"
                id="amount"
                value={amount || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setAmount(val);
                  if (!monthsManuallyEdited) {
                    setMonths(calculateRecommendedMonths(val, currency));
                  }
                }}
                error={!!actionData?.errors?.amount}
              />
              {currency === "VND" && (
                <FormMessage hint="VND phải là số nguyên (không có phần thập phân)" />
              )}
              <FormMessage error={actionData?.errors?.amount} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="months">
                Số tháng <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                name="months"
                id="months"
                min="1"
                step="1"
                value={months}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setMonths(val);
                  setMonthsManuallyEdited(true);
                }}
                className={actionData?.errors?.months ? "border-red-300 focus-visible:ring-red-500" : ""}
                required
              />
              <MonthsRecommendation months={recommendedMonths} />
              <FormMessage error={actionData?.errors?.months} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidDate">
                Ngày thanh toán <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                name="paidDate"
                id="paidDate"
                defaultValue={actionData?.values?.paidDate || payment.paidDate}
                className={actionData?.errors?.paidDate ? "border-red-300 focus-visible:ring-red-500" : ""}
                required
              />
              <FormMessage
                error={actionData?.errors?.paidDate}
                hint={actionData?.errors?.paidDate ? undefined : "Ngày hết hạn = ngày thanh toán + số tháng (theo lịch)"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                name="note"
                id="note"
                rows={3}
                defaultValue={actionData?.values?.note || payment.note || ""}
                placeholder="Ghi chú (tùy chọn) về thanh toán..."
              />
            </div>
            <FormActions>
              <Button variant="outline" asChild>
                <Link to={`/826264/customers/${customer._id}`}>Hủy</Link>
              </Button>
              <Button type="submit">Lưu thay đổi</Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

## File: app/routes/826264.payments.new.tsx
```typescript
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import {
  redirect,
  json,
  useLoaderData,
  useActionData,
  Form,
  Link,
} from "@remix-run/react";
import { useState } from "react";
import { ObjectId } from "mongodb";
import { getCustomerById, listCustomers } from "~/models/customer.server";
import { createPayment, getLatestPaymentForCustomer } from "~/models/payment.server";
import {
  calculateRecommendedMonths,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
  computeStatus,
} from "~/models/subscriptionStatus";
import { getTodayDateOnly } from "~/utils/date";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import {
  Breadcrumb,
  FormErrorBanner,
  FormMessage,
  FormActions,
  CurrencySelect,
  AmountPresetChips,
  CurrencyAmountInput,
  MonthsRecommendation,
} from "~/components/shared";
export const meta: MetaFunction = () => [
  { title: "Thêm thanh toán - Quản trị - Kana Box V2" },
];
interface LoaderData {
  customer: {
    _id: string;
    name: string;
  } | null;
  customers: Array<{
    _id: string;
    name: string;
  }>;
  defaultPaidDate: string;
  currentSubscription: {
    expiry: string;
    statusText: string;
  } | null;
  basePriceVnd: number;
  basePriceUsd: number;
}
interface ActionData {
  errors?: {
    customerId?: string;
    amount?: string;
    months?: string;
    paidDate?: string;
    form?: string;
  };
  values?: {
    customerId: string;
    currency: string;
    amount: string;
    months: string;
    paidDate: string;
    note: string;
  };
  recommendedMonths?: number;
}
function formatStatusContext(status: ReturnType<typeof computeStatus>): string {
  if (status.daysToEnd !== null) {
    if (status.daysToEnd === 0) {
      return `${status.label} (hôm nay)`;
    }
    return `${status.label} (${status.daysToEnd} ngày còn lại)`;
  }
  if (status.daysPastEnd !== null) {
    return `${status.label} (${status.daysPastEnd} ngày quá hạn)`;
  }
  return status.label;
}
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  let customer = null;
  let defaultPaidDate = getTodayDateOnly();
  let currentSubscription: LoaderData["currentSubscription"] = null;
  if (customerId && ObjectId.isValid(customerId)) {
    const c = await getCustomerById(customerId);
    if (c) {
      customer = {
        _id: c._id.toString(),
        name: c.displayName,
      };
      const latestPayment = await getLatestPaymentForCustomer(customerId);
      if (latestPayment) {
        defaultPaidDate = latestPayment.endDate;
        const status = computeStatus(latestPayment.endDate);
        currentSubscription = {
          expiry: latestPayment.endDate,
          statusText: formatStatusContext(status),
        };
      }
    }
  }
  const allCustomers = await listCustomers();
  return json<LoaderData>({
    customer,
    customers: allCustomers.map((c) => ({
      _id: c._id.toString(),
      name: c.displayName,
    })),
    defaultPaidDate,
    currentSubscription,
    basePriceVnd: BASE_PRICE_VND,
    basePriceUsd: BASE_PRICE_USD,
  });
}
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const customerId = String(formData.get("customerId") || "").trim();
  const currency = String(formData.get("currency") || "VND") as "VND" | "USD";
  const amountStr = String(formData.get("amount") || "").trim();
  const monthsStr = String(formData.get("months") || "").trim();
  const paidDate = String(formData.get("paidDate") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const errors: ActionData["errors"] = {};
  if (!customerId || !ObjectId.isValid(customerId)) {
    errors.customerId = "Vui lòng chọn thành viên hợp lệ";
  } else {
    const c = await getCustomerById(customerId);
    if (!c) {
      errors.customerId = "Không tìm thấy thành viên";
    }
  }
  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount <= 0) {
    errors.amount = "Số tiền phải là số dương";
  } else if (currency === "VND" && !Number.isInteger(amount)) {
    errors.amount = "Số tiền VND phải là số nguyên (không có phần thập phân)";
  }
  const months = parseInt(monthsStr, 10);
  if (!monthsStr || isNaN(months) || months < 1) {
    errors.months = "Số tháng tối thiểu là 1";
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!paidDate || !dateRegex.test(paidDate)) {
    errors.paidDate = "Vui lòng nhập ngày hợp lệ (YYYY-MM-DD)";
  }
  const recommendedMonths =
    amount > 0 && !isNaN(amount)
      ? calculateRecommendedMonths(amount, currency)
      : 1;
  if (Object.keys(errors).length > 0) {
    return json<ActionData>(
      {
        errors,
        values: {
          customerId,
          currency,
          amount: amountStr,
          months: monthsStr,
          paidDate,
          note,
        },
        recommendedMonths,
      },
      { status: 400 }
    );
  }
  try {
    await createPayment({
      customerId,
      paidDate,
      currency,
      amount,
      months,
      note: note || undefined,
    });
    return redirect(`/826264/customers/${customerId}`);
  } catch (error) {
    console.error("Error creating payment:", error);
    return json<ActionData>(
      {
        errors: {
          form: "Tạo thanh toán thất bại. Vui lòng thử lại.",
        },
        values: {
          customerId,
          currency,
          amount: amountStr,
          months: monthsStr,
          paidDate,
          note,
        },
        recommendedMonths,
      },
      { status: 500 }
    );
  }
}
export default function AdminAddPayment() {
  const { customer, customers, defaultPaidDate, currentSubscription, basePriceVnd, basePriceUsd } =
    useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const initialCurrency = (actionData?.values?.currency as "VND" | "USD") || "VND";
  const [currency, setCurrency] = useState<"VND" | "USD">(initialCurrency);
  const [amount, setAmount] = useState(() => {
    const parsed = actionData?.values?.amount
      ? parseFloat(actionData.values.amount)
      : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return initialCurrency === "USD" ? BASE_PRICE_USD : 50000;
  });
  const [monthsManuallyEdited, setMonthsManuallyEdited] = useState(false);
  const recommendedMonths = calculateRecommendedMonths(amount, currency);
  const [months, setMonths] = useState(
    parseInt(actionData?.values?.months || String(recommendedMonths) || "1", 10) || 1
  );
  const handleAmountPreset = (preset: number) => {
    setAmount(preset);
    if (!monthsManuallyEdited) {
      setMonths(calculateRecommendedMonths(preset, currency));
    }
  };
  const breadcrumbItems = customer
    ? [{ label: customer.name, to: `/826264/customers/${customer._id}` }, { label: "Thêm thanh toán" }]
    : [{ label: "Bảng điều khiển", to: "/826264" }, { label: "Thêm thanh toán" }];
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      <Card>
        <CardHeader>
          <CardTitle>Thêm thanh toán</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-5">
            {actionData?.errors?.form && (
              <FormErrorBanner message={actionData.errors.form} />
            )}
            <div className="space-y-2">
              <Label htmlFor="customerId">
                Thành viên <span className="text-red-500">*</span>
              </Label>
              {customer ? (
                <>
                  <input type="hidden" name="customerId" value={customer._id} />
                  <Input type="text" value={customer.name} disabled className="bg-zinc-50" />
                </>
              ) : (
                <select
                  name="customerId"
                  id="customerId"
                  defaultValue={actionData?.values?.customerId || ""}
                  className={cn(
                    "flex h-9 w-full rounded-lg border bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500",
                    actionData?.errors?.customerId ? "border-red-300" : "border-zinc-300"
                  )}
                  required
                >
                  <option value="">Chọn thành viên...</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              )}
              <FormMessage error={actionData?.errors?.customerId} />
              {customer && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                  {currentSubscription ? (
                    <>
                      Hết hạn hiện tại: <span className="font-medium tabular-nums">{currentSubscription.expiry}</span>
                      <span className="mx-1 text-indigo-300">·</span>
                      Trạng thái: <span className="font-medium">{currentSubscription.statusText}</span>
                    </>
                  ) : (
                    "Thành viên này chưa có thanh toán hiện tại."
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">
                Tiền tệ <span className="text-red-500">*</span>
              </Label>
              <CurrencySelect
                name="currency"
                id="currency"
                value={currency}
                onChange={setCurrency}
              />
              <FormMessage hint={`Giá cơ bản: ${basePriceVnd.toLocaleString("vi-VN")} ₫/tháng hoặc $${basePriceUsd}/tháng`} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">
                Số tiền <span className="text-red-500">*</span>
              </Label>
              {currency === "VND" && (
                <AmountPresetChips currentAmount={amount} onSelect={handleAmountPreset} />
              )}
              <CurrencyAmountInput
                currency={currency}
                name="amount"
                id="amount"
                value={amount || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setAmount(val);
                  if (!monthsManuallyEdited) {
                    setMonths(calculateRecommendedMonths(val, currency));
                  }
                }}
                error={!!actionData?.errors?.amount}
              />
              <FormMessage error={actionData?.errors?.amount} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="months">
                Số tháng <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                name="months"
                id="months"
                min="1"
                step="1"
                value={months}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setMonths(val);
                  setMonthsManuallyEdited(true);
                }}
                className={actionData?.errors?.months ? "border-red-300 focus-visible:ring-red-500" : ""}
                required
              />
              <MonthsRecommendation months={recommendedMonths} />
              <FormMessage error={actionData?.errors?.months} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidDate">
                Ngày thanh toán <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                name="paidDate"
                id="paidDate"
                defaultValue={actionData?.values?.paidDate || defaultPaidDate}
                className={actionData?.errors?.paidDate ? "border-red-300 focus-visible:ring-red-500" : ""}
                required
              />
              <FormMessage
                error={actionData?.errors?.paidDate}
                hint={actionData?.errors?.paidDate ? undefined : "Ngày hết hạn = ngày thanh toán + số tháng (theo lịch)"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                name="note"
                id="note"
                rows={3}
                defaultValue={actionData?.values?.note || ""}
                placeholder="Ghi chú (tùy chọn) về thanh toán..."
              />
            </div>
            <FormActions>
              <Button variant="outline" asChild>
                <Link to={customer ? `/826264/customers/${customer._id}` : "/826264"}>Hủy</Link>
              </Button>
              <Button type="submit">Lưu thanh toán</Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

## File: app/routes/826264.tsx
```typescript
import {
  Link,
  Outlet,
  useLocation,
} from "@remix-run/react";
import { useState } from "react";
import {
  LayoutDashboard,
  UserPlus,
  Archive,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
function AdminNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    {
      to: "/826264",
      label: "Bảng điều khiển",
      icon: LayoutDashboard,
      exact: false,
    },
    {
      to: "/826264/customers/new",
      label: "Thêm thành viên",
      icon: UserPlus,
      exact: true,
    },
    {
      to: "/826264/customers/archived",
      label: "Thành viên lưu trữ",
      icon: Archive,
      exact: true,
    },
  ];
  const isActive = (path: string, exact: boolean) =>
    exact ? currentPath === path : currentPath.startsWith(path);
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/826264" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500">
                <span className="text-xs font-bold text-white">K</span>
              </div>
              <span className="text-sm font-semibold text-white">Quản trị</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive(item.to, item.exact)
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden md:flex items-center">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Trang công khai
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
          <div className="px-3 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.to, item.exact)
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Trang công khai
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminNavigation />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

## File: app/routes/customers._index.tsx
```typescript
import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
export function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  return redirect(qs ? `/?${qs}` : "/");
}
```

## File: app/routes/customers.$customerId.edit.tsx
```typescript
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}
function redirectToPublicCustomer(request: Request, customerId: string | undefined) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  if (!customerId || !isValidObjectId(customerId)) {
    return redirect(qs ? `/?${qs}` : "/");
  }
  return redirect(`/customers/${customerId}${qs ? `?${qs}` : ""}`);
}
export function loader({ request, params }: LoaderFunctionArgs) {
  return redirectToPublicCustomer(request, params.customerId);
}
export function action({ request, params }: ActionFunctionArgs) {
  return redirectToPublicCustomer(request, params.customerId);
}
```

## File: app/routes/customers.$customerId.tsx
```typescript
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";
import { ObjectId } from "mongodb";
import { getCustomerById } from "~/models/customer.server";
import { getLatestPaymentForCustomer } from "~/models/payment.server";
import { computeStatus } from "~/models/subscriptionStatus";
import PublicLanguageSelect from "~/components/PublicLanguageSelect";
import { getPublicStrings, normalizePublicLang } from "~/i18n/public";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { CalendarDays, CreditCard, Clock, StickyNote, FileX } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  formatCurrency,
  statusAccent,
  NoteBlock,
  EmptyState,
  InfoItem,
} from "~/components/shared";
const statusVariant: Record<string, "active" | "due" | "grace" | "expired" | "none"> = {
  active: "active",
  due: "due",
  grace: "grace",
  expired: "expired",
  none: "none",
};
export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: `${data?.customer.name || getPublicStrings(data?.lang === "en" ? "en" : "vi").membersHeading} - Kana Box V2`,
  },
];
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { customerId } = params;
  const url = new URL(request.url);
  const lang = normalizePublicLang(url.searchParams.get("lang"));
  const strings = getPublicStrings(lang);
  if (!customerId || !ObjectId.isValid(customerId)) {
    throw new Response("ID thành viên không hợp lệ", { status: 400 });
  }
  const customer = await getCustomerById(customerId);
  if (!customer || customer.isPublicHidden || customer.isArchived) {
    throw new Response("Không tìm thấy thành viên", { status: 404 });
  }
  const latestPayment = await getLatestPaymentForCustomer(customerId);
  const computedStatus = computeStatus(latestPayment?.endDate || null);
  const status = {
    ...computedStatus,
    label: strings.statusLabels[computedStatus.status],
  };
  return json({
    customer: {
      _id: customer._id.toString(),
      name: customer.displayName,
      note: customer.note,
    },
    latestPayment: latestPayment
      ? {
        _id: latestPayment._id.toString(),
        paidDate: latestPayment.paidDate,
        endDate: latestPayment.endDate,
        currency: latestPayment.currency,
        amount: latestPayment.amount,
        months: latestPayment.months,
        note: latestPayment.note,
      }
      : null,
    status,
    lang,
  });
}
export default function PublicCustomerDetail() {
  const { customer, latestPayment, status, lang } = useLoaderData<typeof loader>();
  const strings = getPublicStrings(lang);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-end">
        <PublicLanguageSelect
          lang={lang}
          label={strings.languageLabel}
          optionVi={strings.languageOptions.vi}
          optionEn={strings.languageOptions.en}
        />
      </div>
      <Card className={cn("border-l-[3px] overflow-hidden", statusAccent[status.status] || "border-l-zinc-300")}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{customer.name}</CardTitle>
              <div className="mt-2">
                <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        {customer.note && (
          <CardContent className="pb-4">
            <NoteBlock icon={StickyNote} label={strings.customerDetail.note} text={customer.note} />
          </CardContent>
        )}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{strings.customerDetail.subscriptionStatusHeading}</CardTitle>
        </CardHeader>
        <CardContent>
          {latestPayment ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem icon={CalendarDays} label={strings.customerDetail.currentPeriodEnds}>
                <p className={cn(
                  "mt-0.5 text-base font-semibold tabular-nums",
                  status.status === "expired" ? "text-red-600" : "text-zinc-900"
                )}>
                  {latestPayment.endDate}
                </p>
              </InfoItem>
              <InfoItem icon={CreditCard} label={strings.customerDetail.latestPayment}>
                <p className="mt-0.5 text-base font-semibold text-zinc-900 tabular-nums">
                  {formatCurrency(latestPayment.amount, latestPayment.currency)}
                </p>
              </InfoItem>
              <InfoItem icon={CalendarDays} label={strings.customerDetail.paidDate}>
                <p className="mt-0.5 text-sm text-zinc-900 tabular-nums">{latestPayment.paidDate}</p>
              </InfoItem>
              <InfoItem icon={Clock} label={strings.customerDetail.months}>
                <p className="mt-0.5 text-sm text-zinc-900">
                  {strings.customerTable.formatMonths(latestPayment.months)}
                </p>
              </InfoItem>
              {latestPayment.note && (
                <>
                  <Separator className="sm:col-span-2" />
                  <div className="sm:col-span-2">
                    <InfoItem icon={StickyNote} label={strings.customerDetail.note}>
                      <p className="mt-0.5 text-sm text-zinc-700">{latestPayment.note}</p>
                    </InfoItem>
                  </div>
                </>
              )}
            </div>
          ) : (
            <EmptyState icon={FileX} message={strings.customerDetail.noPaymentHistory} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## File: app/routes/customers.new.tsx
```typescript
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
function redirectToPublicHome(request: Request) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  return redirect(qs ? `/?${qs}` : "/");
}
export function loader({ request }: LoaderFunctionArgs) {
  return redirectToPublicHome(request);
}
export function action({ request }: ActionFunctionArgs) {
  return redirectToPublicHome(request);
}
```

## File: app/routes/customers.tsx
```typescript
import { Outlet } from "@remix-run/react";
export default function CustomersLayout() {
  return <Outlet />;
}
```

## File: app/routes/payments.new.tsx
```typescript
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}
function redirectFromPublicPaymentsNew(request: Request) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const customerId = url.searchParams.get("customerId") || undefined;
  const destination =
    customerId && isValidObjectId(customerId) ? `/customers/${customerId}` : "/";
  return redirect(`${destination}${qs ? `?${qs}` : ""}`);
}
export function loader({ request }: LoaderFunctionArgs) {
  return redirectFromPublicPaymentsNew(request);
}
export function action({ request }: ActionFunctionArgs) {
  return redirectFromPublicPaymentsNew(request);
}
```

## File: app/tailwind.css
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;
@layer base {
  html {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  body {
    @apply text-zinc-900;
  }
  * {
    @apply border-zinc-200;
  }
}
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  opacity: 1;
}
```

## File: app/utils/date.ts
```typescript
export function parseDateOnly(dateString: string): Date {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD.`);
  }
  const [, year, month, day] = match;
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    0, 0, 0, 0
  );
  if (
    date.getFullYear() !== parseInt(year, 10) ||
    date.getMonth() !== parseInt(month, 10) - 1 ||
    date.getDate() !== parseInt(day, 10)
  ) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  return date;
}
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export function getTodayDateOnly(): string {
  return formatDateOnly(new Date());
}
export function addDaysDateOnly(dateString: string, days: number): string {
  const date = parseDateOnly(dateString);
  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
}
export function diffDaysDateOnly(dateA: string, dateB: string): number {
  const a = parseDateOnly(dateA);
  const b = parseDateOnly(dateB);
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / msPerDay);
}
export function addMonthsDateOnly(dateString: string, months: number): string {
  const date = parseDateOnly(dateString);
  const originalDay = date.getDate();
  const targetMonth = date.getMonth() + months;
  date.setMonth(targetMonth);
  if (date.getDate() !== originalDay) {
    date.setDate(0);
  }
  return formatDateOnly(date);
}
export function addMonthsAsDays(dateString: string, months: number): string {
  return addMonthsDateOnly(dateString, months);
}
export function getMonthBucket(dateString: string): string {
  const date = parseDateOnly(dateString);
  const day = date.getDate();
  if (day >= 6) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const month = String(prev.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
export function getRevenueBucketRange(monthBucket: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthBucket.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const start = `${year}-${String(month).padStart(2, "0")}-06`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-05`;
  return { start, end };
}
export function getRecentMonthBuckets(count: number): string[] {
  const buckets: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    buckets.push(`${year}-${month}`);
  }
  return buckets;
}
export function isValidDateOnly(dateString: string): boolean {
  try {
    parseDateOnly(dateString);
    return true;
  } catch {
    return false;
  }
}
export function compareDateOnly(a: string, b: string): number {
  return diffDaysDateOnly(a, b);
}
```

## File: app/utils/db.server.ts
```typescript
import { MongoClient, Db } from "mongodb";
declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "subscription";
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required.");
}
let clientPromise: Promise<MongoClient>;
if (!global.__mongoClientPromise) {
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 50,
    minPoolSize: 5,
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true,
  });
  global.__mongoClientPromise = client.connect();
}
clientPromise = global.__mongoClientPromise;
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(MONGODB_DB_NAME);
}
export async function closeDbConnection(): Promise<void> {
  if (global.__mongoClientPromise) {
    const client = await clientPromise;
    await client.close();
    global.__mongoClientPromise = undefined;
  }
}
```

## File: env.d.ts
```typescript

```

## File: package.json
```json
{
  "name": "subscription-ledger",
  "private": true,
  "sideEffects": false,
  "type": "module",
  "scripts": {
    "dev": "remix vite:dev --port 7272",
    "build": "remix vite:build",
    "start": "remix-serve ./build/server/index.js",
    "typecheck": "tsc",
    "init:db": "node scripts/init-db.mjs"
  },
  "dependencies": {
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@remix-run/node": "^2.12.0",
    "@remix-run/react": "^2.12.0",
    "@remix-run/serve": "^2.12.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "dotenv": "^16.4.5",
    "isbot": "^4.1.0",
    "lucide-react": "^0.577.0",
    "mongodb": "^6.9.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "shadcn": "^4.0.2",
    "tailwind-merge": "^3.5.0"
  },
  "devDependencies": {
    "@remix-run/dev": "^2.12.0",
    "@types/react": "^18.2.20",
    "@types/react-dom": "^18.2.7",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.12",
    "typescript": "^5.1.6",
    "vite": "^5.1.0",
    "vite-tsconfig-paths": "^4.2.1"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## File: postcss.config.js
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## File: scripts/init-db.mjs
```javascript
import "dotenv/config";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "subscription";

if (!MONGODB_URI) {
    console.error("MONGODB_URI environment variable is required.");
    process.exit(1);
}

const DESIRED_INDEXES = {
    customers: [
        {
            name: "ix_customers_displayName_active_unique",
            key: { displayName: 1 },
            unique: true,
            partialFilterExpression: { isArchived: { $ne: true } },
        },
    ],
    payments: [
        {
            name: "ix_payments_customerId_paidDate_desc",
            key: { customerId: 1, paidDate: -1 },
            unique: false,
        },
        {
            name: "ix_payments_paidDate_isVoided",
            key: { paidDate: 1, isVoided: 1 },
            unique: false,
        },
        {
            name: "ix_payments_isVoided_paidDate",
            key: { isVoided: 1, paidDate: -1 },
            unique: false,
        },
    ],
};

async function ensureIndex(collection, desired) {
    const existing = await collection.indexes();
    const found = existing.find((idx) => idx.name === desired.name);

    if (found) {
        const keysMatch =
            JSON.stringify(found.key) === JSON.stringify(desired.key);
        const uniqueMatch = (found.unique || false) === desired.unique;
        const partialMatch = desired.partialFilterExpression
            ? JSON.stringify(found.partialFilterExpression) === JSON.stringify(desired.partialFilterExpression)
            : !found.partialFilterExpression;

        if (keysMatch && uniqueMatch && partialMatch) {
            console.log(`  [OK] Index "${desired.name}" already exists and is correct.`);
            return;
        }

        console.log(`  [WARN] Index "${desired.name}" exists but differs. Leaving it unchanged.`);
        return;
    }

    console.log(`  [CREATE] Creating index "${desired.name}"...`);
    const options = { name: desired.name };
    if (desired.unique) {
        options.unique = true;
    }
    if (desired.partialFilterExpression) {
        options.partialFilterExpression = desired.partialFilterExpression;
    }
    await collection.createIndex(desired.key, options);
    console.log(`  [DONE] Index "${desired.name}" created.`);
}

async function main() {
    console.log(`Connecting to MongoDB...`);
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    console.log(`Connected to database: ${MONGODB_DB_NAME}`);

    for (const [collectionName, indexes] of Object.entries(DESIRED_INDEXES)) {
        console.log(`\nCollection: ${collectionName}`);
        const collection = db.collection(collectionName);
        for (const desired of indexes) {
            await ensureIndex(collection, desired);
        }
    }

    console.log("\nDone.");
    await client.close();
}

main().catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
});
```

## File: tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
      },
      colors: {
        status: {
          active: "#dcfce7",
          "active-border": "#16a34a",
          due: "#fef9c3",
          "due-border": "#ca8a04",
          grace: "#ffedd5",
          "grace-border": "#ea580c",
          expired: "#fee2e2",
          "expired-border": "#dc2626",
        },
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "zoom-in-95": {
          from: { transform: "scale(0.95)" },
          to: { transform: "scale(1)" },
        },
        "zoom-out-95": {
          from: { transform: "scale(1)" },
          to: { transform: "scale(0.95)" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-4px)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "fade-out": "fade-out 0.15s ease-in",
        "zoom-in-95": "zoom-in-95 0.15s ease-out",
        "zoom-out-95": "zoom-out-95 0.15s ease-in",
        "slide-in-from-top": "slide-in-from-top 0.2s ease-out",
      },
    },
  },
  plugins: [
    function ({ addUtilities }: { addUtilities: Function }) {
      addUtilities({
        ".animate-in": {
          animationDuration: "150ms",
          animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          animationFillMode: "forwards",
        },
        ".animate-out": {
          animationDuration: "150ms",
          animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          animationFillMode: "forwards",
        },
        ".fade-in-0": { animationName: "fade-in" },
        ".fade-out-0": { animationName: "fade-out" },
        ".zoom-in-95": { animationName: "zoom-in-95" },
        ".zoom-out-95": { animationName: "zoom-out-95" },
        ".slide-in-from-left-1\\/2": {},
        ".slide-in-from-top-\\[48\\%\\]": {},
        ".slide-out-to-left-1\\/2": {},
        ".slide-out-to-top-\\[48\\%\\]": {},
      });
    },
  ],
} satisfies Config;
```

## File: tsconfig.json
```json
{
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "**/.server/**/*.ts",
    "**/.server/**/*.tsx",
    "**/.client/**/*.ts",
    "**/.client/**/*.tsx"
  ],
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "target": "ES2022",
    "strict": true,
    "allowJs": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./app/*"]
    },
    "noEmit": true
  }
}
```

## File: vite.config.ts
```typescript
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  envDir: ".",
});
```
