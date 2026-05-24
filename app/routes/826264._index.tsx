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
      const archived = await archiveCustomer(customerId);
      if (!archived) {
        return json(
          { ok: false, error: "Không tìm thấy thành viên", customerId },
          { status: 404 }
        );
      }
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
