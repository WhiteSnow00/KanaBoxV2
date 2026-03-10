import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData, useFetcher, Link } from "@remix-run/react";
import { useState } from "react";
import { ObjectId } from "mongodb";
import {
  Users, CheckCircle, Clock, AlertTriangle, XCircle,
  Search, UserPlus, TrendingUp,
} from "lucide-react";
import { countCustomers, listCustomers, archiveCustomer } from "~/models/customer.server";
import {
  computeStatus,
  listLatestPaymentsForAllCustomers,
  listPaymentsForRevenueWindow,
  computeMonthlyTotals,
} from "~/models/payment.server";
import { getTodayDateOnly, getMonthBucket, getRevenueBucketRange } from "~/utils/date";
import CustomerTable from "~/components/CustomerTable";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

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

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "archive") {
    const customerId = String(formData.get("customerId") || "");
    if (customerId && ObjectId.isValid(customerId)) {
      await archiveCustomer(customerId);
    }
  }

  return json({ ok: true });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const totalCustomers = await countCustomers();
  const customers = await listCustomers();
  const statusCounts = {
    active: 0,
    due: 0,
    grace: 0,
    expired: 0,
    none: 0,
  };
  const latestPaymentsMap = await listLatestPaymentsForAllCustomers();
  const customersWithStatus = customers.map((customer) => {
    const latestPayment = latestPaymentsMap.get(customer._id.toString());
    const status = computeStatus(latestPayment?.endDate || null);
    statusCounts[status.status]++;
    return {
      customer: {
        _id: customer._id.toString(),
        name: customer.displayName,
        note: customer.note,
        isPublicHidden: customer.isPublicHidden,
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

  const FIXED_START_BUCKET = "2026-02";
  const today = getTodayDateOnly();
  const currentBucket = getMonthBucket(today);

  const monthBuckets = generateMonthBuckets(FIXED_START_BUCKET, currentBucket);

  const firstRange = getRevenueBucketRange(monthBuckets[0]);
  const lastRange = getRevenueBucketRange(monthBuckets[monthBuckets.length - 1]);

  const paymentsInWindow = await listPaymentsForRevenueWindow(
    firstRange.start,
    lastRange.end
  );

  const monthlyMap = computeMonthlyTotals(paymentsInWindow, monthBuckets);
  const monthlyTotals: MonthlyTotal[] = monthBuckets.map((month) => {
    const totals = monthlyMap.get(month) || { VND: 0, USD: 0, convertedVnd: 0 };
    return {
      month,
      vnd: totals.VND,
      usd: totals.USD,
      convertedVnd: totals.convertedVnd,
    };
  });
  return json({
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

function formatMonth(monthBucket: string): string {
  const [year, month] = monthBucket.split("-");
  return `Tháng ${parseInt(month, 10)}/${year}`;
}

export default function AdminDashboard() {
  const {
    totalCustomers,
    statusCounts,
    monthlyTotals,
    customers,
  } = useLoaderData<typeof loader>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const fetcher = useFetcher();

  const filteredCustomers = customers.filter((item) => {
    const matchesSearch = item.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === null || item.status.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleArchive = (customerId: string) => {
    fetcher.submit(
      { intent: "archive", customerId },
      { method: "post" }
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Bảng điều khiển</h1>
        <p className="mt-1 text-sm text-zinc-500">Quản lý đăng ký và xem báo cáo doanh thu</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setStatusFilter(null)}
          className={cn(
            "rounded-xl border bg-white p-4 text-left transition-all",
            statusFilter === null
              ? "border-indigo-300 ring-2 ring-indigo-200 shadow-sm"
              : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-medium text-zinc-500">Tổng thành viên</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{totalCustomers}</p>
        </button>
        {statusCards.map(({ key, label, icon: Icon, color, bg, border, ring }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              bg,
              statusFilter === key
                ? `${border} ring-2 ${ring} shadow-sm`
                : `${border} hover:shadow-sm`
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn("h-4 w-4", color)} />
              <span className={cn("text-xs font-medium", color)}>{label}</span>
            </div>
            <p className={cn("text-2xl font-semibold tabular-nums", color)}>
              {statusCounts[key]}
            </p>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            Thành viên
            <span className="ml-2 text-sm font-normal text-zinc-400">({filteredCustomers.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm..."
                className="pl-9 w-full sm:w-48"
              />
            </div>
            <Button asChild>
              <Link to="/826264/customers/new">
                <UserPlus className="h-4 w-4 mr-2" />
                Thêm thành viên
              </Link>
            </Button>
          </div>
        </div>
        <CustomerTable
          customers={filteredCustomers}
          basePath="/826264/customers"
          showAdminActions={true}
          onArchive={handleArchive}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            <div>
              <CardTitle className="text-base">Doanh thu theo tháng</CardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">Chu kỳ ngày 6 → ngày 5 tháng sau</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tháng</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">VND</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">USD</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Tổng (quy đổi VND)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {monthlyTotals.map((month) => (
                  <tr key={month.month} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 whitespace-nowrap">{formatMonth(month.month)}</td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-600 whitespace-nowrap tabular-nums">
                      {month.vnd > 0 ? `${month.vnd.toLocaleString("vi-VN")} ₫` : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-600 whitespace-nowrap tabular-nums">
                      {month.usd > 0 ? `$${month.usd.toFixed(2)}` : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-indigo-600 whitespace-nowrap tabular-nums">
                      {month.convertedVnd > 0 ? `${month.convertedVnd.toLocaleString("vi-VN")} ₫` : <span className="text-zinc-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}