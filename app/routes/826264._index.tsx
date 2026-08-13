import type { MetaFunction } from "@remix-run/node";
import { defer } from "@remix-run/node";
import { Await, Link, useFetcher, useLoaderData } from "@remix-run/react";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  TrendingUp,
  UserPlus,
  Users,
  Globe2,
  Loader2,
  PowerOff,
} from "lucide-react";
import { countCustomers, listCustomers } from "~/models/customer.server";
import {
  computeMonthlyTotals,
  computeStatus,
  listLatestPaymentsForAllCustomers,
  listPaymentsForRevenueWindow,
} from "~/models/payment.server";
import { getMonthBucket, getRevenueBucketRange, getTodayDateOnly } from "~/utils/date";
import { getSiteSettings } from "~/models/siteSettings.server";
import { cn } from "~/lib/utils";
import AdminMemberList, {
  type AdminMemberWithStatus,
  type AdminStatusFilter,
} from "~/components/AdminMemberList";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  PageHeader,
  PaginationControls,
  SearchField,
  StatCard,
  paginateItems,
} from "~/components/shared";

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

export async function loader() {
  const monthlyTotals = loadMonthlyTotals();
  const [totalCustomers, customers, latestPaymentsMap, siteSettings] = await Promise.all([
    countCustomers(),
    listCustomers(),
    listLatestPaymentsForAllCustomers(),
    getSiteSettings(),
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
    publicSiteDisabled: siteSettings.publicSiteDisabled,
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
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [monthlyTotals]);

  const paginatedMonthlyTotals = useMemo(
    () => paginateItems(monthlyTotals, page),
    [monthlyTotals, page]
  );

  return (
    <div className="space-y-3">
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tháng</th>
              <th className="text-right">VND</th>
              <th className="text-right">USD</th>
              <th className="text-right">Tổng (quy đổi VND)</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMonthlyTotals.map((month) => (
              <tr key={month.month}>
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
      <PaginationControls
        page={page}
        totalItems={monthlyTotals.length}
        itemLabel="tháng"
        onPageChange={setPage}
      />
    </div>
  );
}

function RevenueSkeleton() {
  return (
    <div className="surface space-y-2 p-4">
      <div className="h-4 w-36 rounded bg-zinc-100 animate-pulse" />
      <div className="h-4 w-full rounded bg-zinc-100 animate-pulse" />
      <div className="h-4 w-5/6 rounded bg-zinc-100 animate-pulse" />
    </div>
  );
}

export default function AdminDashboard() {
  const {
    totalCustomers,
    statusCounts,
    monthlyTotals,
    customers,
    publicSiteDisabled,
  } = useLoaderData<typeof loader>();
  const siteStatusFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    publicSiteDisabled?: boolean;
  }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>(null);
  const [cancelledOnly, setCancelledOnly] = useState(false);
  const pendingPublicSiteDisabled = siteStatusFetcher.formData?.get(
    "publicSiteDisabled"
  );
  const displayedPublicSiteDisabled =
    pendingPublicSiteDisabled === "true"
      ? true
      : pendingPublicSiteDisabled === "false"
        ? false
        : publicSiteDisabled;
  const publicSiteEnabled = !displayedPublicSiteDisabled;
  const isUpdatingPublicSite = siteStatusFetcher.state !== "idle";

  const filteredCustomers = customers.filter((item) => {
    const matchesSearch = item.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === null || item.status.status === statusFilter;
    const matchesCancelled = !cancelledOnly || item.customer.renewalCancelled === true;
    return matchesSearch && matchesStatus && matchesCancelled;
  });

  return (
    <div className="page-stack">
      <PageHeader
        title="Bảng điều khiển"
        description="Quản lý đăng ký và xem báo cáo doanh thu"
      />

      <Card
        className={cn(
          "overflow-hidden",
          displayedPublicSiteDisabled
            ? "border-amber-200"
            : "border-emerald-200"
        )}
      >
        <CardContent className="flex flex-col gap-5 pt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border",
                displayedPublicSiteDisabled
                  ? "border-amber-200 bg-amber-50 text-amber-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-600"
              )}
            >
              {displayedPublicSiteDisabled ? (
                <PowerOff className="h-5 w-5" />
              ) : (
                <Globe2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">
                Trang công khai
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {displayedPublicSiteDisabled
                  ? "Đang hiển thị thông báo “Group không còn hoạt động” trên tất cả trang công khai."
                  : "Khách truy cập hiện có thể xem và điều hướng trên trang công khai."}
              </p>
              {siteStatusFetcher.data?.ok === false && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {siteStatusFetcher.data.error}
                </p>
              )}
            </div>
          </div>

          <siteStatusFetcher.Form
            method="post"
            action="/826264"
            className="shrink-0"
          >
            <input
              type="hidden"
              name="publicSiteDisabled"
              value={String(!displayedPublicSiteDisabled)}
            />
            <button
              type="submit"
              name="intent"
              value="set-public-site-disabled"
              role="switch"
              aria-checked={publicSiteEnabled}
              aria-label="Bật hoặc tắt trang công khai"
              disabled={isUpdatingPublicSite}
              className="inline-flex h-10 min-w-40 items-center justify-center gap-2.5 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
                  publicSiteEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    publicSiteEnabled && "translate-x-5"
                  )}
                />
              </span>
              <span>
                {isUpdatingPublicSite
                  ? "Đang cập nhật"
                  : publicSiteEnabled
                    ? "Đang hoạt động"
                    : "Đang đóng"}
              </span>
              {isUpdatingPublicSite && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
            </button>
          </siteStatusFetcher.Form>
        </CardContent>
      </Card>

      <div className="reveal-list grid grid-cols-2 gap-3 lg:grid-cols-6">
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
              placeholder="Tìm kiếm thành viên..."
              className="w-full sm:w-64"
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
