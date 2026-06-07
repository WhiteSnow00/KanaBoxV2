import { Link } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Eye, StickyNote } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  PaginationControls,
  paginateItems,
  formatCurrency,
  statusVariant,
} from "~/components/shared";
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

const rowAccent: Record<string, string> = {
  active: "border-l-emerald-400",
  due: "border-l-amber-400",
  grace: "border-l-orange-400",
  expired: "border-l-red-400",
  none: "border-l-zinc-300",
};

export default function CustomerTable({
  customers,
  basePath,
  i18n,
  isFilteredEmpty = false,
  filteredEmptyTitle,
  filteredEmptySubtitle,
}: CustomerTableProps) {
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    setPage(1);
  }, [customers]);

  const paginatedCustomers = useMemo(
    () => paginateItems(customers, page),
    [customers, page]
  );

  if (customers.length === 0) {
    const emptyTitle = isFilteredEmpty && filteredEmptyTitle ? filteredEmptyTitle : t.emptyTitle;
    const emptySubtitle = isFilteredEmpty ? filteredEmptySubtitle : t.emptySubtitle;

    return (
      <div className="surface flex flex-col items-center justify-center py-16 text-center">
        <div className="icon-tile mx-auto mb-4 h-14 w-14">
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
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.headers.name}</th>
                <th>{t.headers.status}</th>
                <th>{t.headers.endDate}</th>
                <th>{t.headers.latestPayment}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map(({ customer, latestPayment, status }) => (
                <tr
                  key={customer._id}
                  className="group"
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
                    {latestPayment ? formatCurrency(latestPayment.amount, latestPayment.currency) : (
                      <span className="text-zinc-300">{t.noPayment}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="reveal-list space-y-2 md:hidden">
        {paginatedCustomers.map(({ customer, latestPayment, status }) => (
          <div
            key={customer._id}
            className={cn(
              "mobile-record border-l-[3px]",
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
                    {formatCurrency(latestPayment.amount, latestPayment.currency)}
                  </span>
                ) : (
                  <span className="text-zinc-300">{t.noPayment}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <PaginationControls
        page={page}
        totalItems={customers.length}
        itemLabel={t.view === "View" ? "members" : "thành viên"}
        onPageChange={setPage}
      />
    </>
  );
}
