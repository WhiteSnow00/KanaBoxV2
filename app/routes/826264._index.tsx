
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData, Link } from "@remix-run/react";
import { useState } from "react";
import { listCustomers, countCustomers } from "~/models/customer.server";
import {
  computeStatus,
  listPaymentsForRevenueWindow,
  computeMonthlyTotals,
  listLatestPaymentsForAllCustomers,
} from "~/models/payment.server";
import {
  getRevenueBucketRange,
  getMonthBucket,
  getTodayDateOnly,
} from "~/utils/date";
import CustomerTable from "~/components/CustomerTable";

export const meta: MetaFunction = () => [
  { title: "Bảng điều khiển (Quản trị) - Kana Box V2" },
];

interface MonthlyTotal {
  month: string;
  vnd: number;
  usd: number;
  convertedVnd: number;
}

function generateMonthBuckets(startBucket: string, endBucket: string): string[] {
  const buckets: string[] = [];
  const [startYear, startMonth] = startBucket.split("-").map(Number);
  const [endYear, endMonth] = endBucket.split("-").map(Number);

  let y = startYear;
  let m = startMonth;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    buckets.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return buckets;
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

function StatusCard({
  title,
  count,
  bgClass,
  borderClass,
  textClass,
  onClick,
  isSelected,
}: {
  title: string;
  count: number;
  bgClass: string;
  borderClass: string;
  textClass: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 ${borderClass} ${bgClass} p-4 sm:p-6 text-left w-full transition-all cursor-pointer ${isSelected ? "ring-2 ring-offset-2 ring-blue-500 scale-[1.02]" : "hover:opacity-80"
        }`}
    >
      <p className={`text-xs sm:text-sm font-medium ${textClass}`}>{title}</p>
      <p className={`mt-1 text-2xl sm:text-3xl font-semibold ${textClass}`}>
        {count.toLocaleString()}
      </p>
    </button>
  );
}

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

  const filteredCustomers = customers.filter((item) => {
    const matchesSearch = item.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === null || item.status.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Bảng điều khiển (Quản trị)
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý đăng ký và xem báo cáo doanh thu
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-5">
        <StatusCard
          title="Tổng số thành viên"
          count={totalCustomers}
          bgClass="bg-gray-100"
          borderClass="border-gray-400"
          textClass="text-gray-900"
          onClick={() => setStatusFilter(null)}
          isSelected={statusFilter === null}
        />
        <StatusCard
          title="Còn hạn"
          count={statusCounts.active}
          bgClass="bg-green-100"
          borderClass="border-green-600"
          textClass="text-green-900"
          onClick={() => setStatusFilter(statusFilter === "active" ? null : "active")}
          isSelected={statusFilter === "active"}
        />
        <StatusCard
          title="Sắp đến hạn"
          count={statusCounts.due}
          bgClass="bg-yellow-100"
          borderClass="border-yellow-600"
          textClass="text-yellow-900"
          onClick={() => setStatusFilter(statusFilter === "due" ? null : "due")}
          isSelected={statusFilter === "due"}
        />
        <StatusCard
          title="Quá hạn (cao su)"
          count={statusCounts.grace}
          bgClass="bg-orange-100"
          borderClass="border-orange-600"
          textClass="text-orange-900"
          onClick={() => setStatusFilter(statusFilter === "grace" ? null : "grace")}
          isSelected={statusFilter === "grace"}
        />
        <StatusCard
          title="Hết hạn"
          count={statusCounts.expired}
          bgClass="bg-red-100"
          borderClass="border-red-600"
          textClass="text-red-900"
          onClick={() => setStatusFilter(statusFilter === "expired" ? null : "expired")}
          isSelected={statusFilter === "expired"}
        />
      </div>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Tất cả thành viên ({filteredCustomers.length})
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..."
              className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
            <Link
              to="/826264/customers/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
            >
              Thêm thành viên
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <CustomerTable
              customers={filteredCustomers}
              basePath="/826264/customers"
              showAdminActions={true}
            />
          </div>
        </div>
      </div>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Doanh thu theo tháng
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Doanh thu tính theo chu kỳ ngày 6 đến ngày 5 tháng sau
          </p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tháng
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tổng VND
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tổng USD
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tổng VND (Quy đổi)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {monthlyTotals.map((month) => (
                      <tr key={month.month}>
                        <td className="px-4 sm:px-6 py-4 text-sm font-medium whitespace-nowrap">
                          {formatMonth(month.month)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-right whitespace-nowrap">
                          {month.vnd > 0
                            ? `${month.vnd.toLocaleString("vi-VN")} ₫`
                            : "-"}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-right whitespace-nowrap">
                          {month.usd > 0 ? `$${month.usd.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-right font-medium text-blue-700 whitespace-nowrap">
                          {month.convertedVnd > 0
                            ? `${month.convertedVnd.toLocaleString("vi-VN")} ₫`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}