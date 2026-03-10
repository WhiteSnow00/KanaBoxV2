import { Link } from "@remix-run/react";
import { useState } from "react";
import { ChevronRight, StickyNote, Eye, Archive } from "lucide-react";
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

export interface CustomerWithStatus {
  customer: {
    _id: string;
    name: string;
    note?: string;
    isPublicHidden?: boolean;
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
    months: string;
    note: string;
    actions: string;
  };
  noPayment: string;
  view: string;
  formatMonths: (months: number) => string;
}

interface CustomerTableProps {
  customers: CustomerWithStatus[];
  basePath: string;
  showAdminActions?: boolean;
  readOnly?: boolean;
  i18n?: CustomerTableI18n;
  onArchive?: (customerId: string) => void;
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
  showAdminActions = false,
  readOnly = false,
  i18n,
  onArchive,
}: CustomerTableProps) {
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);

  const t: CustomerTableI18n =
    i18n || ({
      emptyTitle: "Chưa có thành viên nào",
      emptySubtitle: "Bắt đầu bằng cách thêm thành viên đầu tiên",
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
    } satisfies CustomerTableI18n);

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 mb-4">
          <Eye className="h-6 w-6 text-zinc-400" />
        </div>
        <p className="text-base font-medium text-zinc-700">{t.emptyTitle}</p>
        {showAdminActions && t.emptySubtitle && (
          <p className="mt-1 text-sm text-zinc-400">{t.emptySubtitle}</p>
        )}
      </div>
    );
  }

  const isOverdue = (status: string) => status === "expired" || status === "grace";

  return (
    <>
      <div className="hidden md:block">
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{t.headers.name}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{t.headers.status}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{t.headers.endDate}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{t.headers.latestPayment}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{t.headers.months}</th>
                {!readOnly && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">{t.headers.actions}</th>
                )}
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
                      {readOnly ? (
                        <span className="font-medium text-zinc-900">{customer.name}</span>
                      ) : (
                        <Link
                          to={`${basePath}/${customer._id}`}
                          className="font-medium text-zinc-900 hover:text-indigo-600 transition-colors"
                        >
                          {customer.name}
                        </Link>
                      )}
                      {!readOnly && customer.isPublicHidden && (
                        <Badge variant="hidden">Ẩn</Badge>
                      )}
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
                      <span className={cn("tabular-nums", status.status === "expired" && "text-red-600 font-medium")}>
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
                  <td className="px-4 py-3 text-sm text-zinc-500 tabular-nums">
                    {latestPayment ? t.formatMonths(latestPayment.months) : <span className="text-zinc-300">—</span>}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`${basePath}/${customer._id}`}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                        >
                          {t.view}
                        </Link>
                        {showAdminActions && isOverdue(status.status) && onArchive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setArchiveTarget({ id: customer._id, name: customer.name })}
                          >
                            <Archive className="h-3 w-3 mr-1" />
                            Lưu trữ
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-2">
        {customers.map(({ customer, latestPayment, status }) => (
          <div
            key={customer._id}
            className={cn(
              "rounded-xl border border-zinc-200 bg-white p-4 border-l-[3px] shadow-sm",
              rowAccent[status.status] || "border-l-zinc-300"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  {readOnly ? (
                    <span className="font-medium text-zinc-900 text-sm truncate">{customer.name}</span>
                  ) : (
                    <Link
                      to={`${basePath}/${customer._id}`}
                      className="font-medium text-zinc-900 text-sm truncate hover:text-indigo-600 transition-colors"
                    >
                      {customer.name}
                    </Link>
                  )}
                  {!readOnly && customer.isPublicHidden && <Badge variant="hidden">Ẩn</Badge>}
                </div>
                <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
              </div>
              {!readOnly && (
                <Link to={`${basePath}/${customer._id}`}>
                  <ChevronRight className="h-5 w-5 text-zinc-400" />
                </Link>
              )}
            </div>
            {latestPayment && (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                <div>
                  <span className="text-zinc-400">{t.headers.endDate}:</span>{" "}
                  <span className={cn("font-medium", status.status === "expired" ? "text-red-600" : "text-zinc-700")}>
                    {latestPayment.endDate}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">{t.headers.latestPayment}:</span>{" "}
                  <span className="font-medium text-zinc-700">
                    {formatAmount(latestPayment.amount, latestPayment.currency)}
                  </span>
                </div>
              </div>
            )}
            {!readOnly && showAdminActions && isOverdue(status.status) && onArchive && (
              <div className="mt-3 pt-3 border-t border-zinc-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setArchiveTarget({ id: customer._id, name: customer.name })}
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Lưu trữ
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu trữ thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn lưu trữ &quot;{archiveTarget?.name}&quot;? Họ sẽ bị ẩn khỏi bảng nhưng dữ liệu thanh toán vẫn được giữ lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (archiveTarget && onArchive) {
                  onArchive(archiveTarget.id);
                }
                setArchiveTarget(null);
              }}
            >
              Lưu trữ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
