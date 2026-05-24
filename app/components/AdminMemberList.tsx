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
