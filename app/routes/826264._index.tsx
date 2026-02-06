/**
 * Admin Home - Dashboard with Stats + Customer List
 * 
 * Shows:
 * - Statistics cards (total, active, due, grace, expired)
 * - Monthly revenue table
 * - Customer list table (same as public but with admin links)
 */

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData, Link } from "@remix-run/react";
import { listCustomers, countCustomers } from "~/models/customer.server";
import {
  getLatestPaymentForCustomer,
  computeStatus,
  listPaymentsForRevenueWindow,
  computeMonthlyTotals,
} from "~/models/payment.server";
import {
  addDaysDateOnly,
  addMonthsDateOnly,
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

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q") || "";

  // Get stats
  const totalCustomers = await countCustomers();
  const customers = await listCustomers(searchQuery);

  const statusCounts = {
    active: 0,
    due: 0,
    grace: 0,
    expired: 0,
    none: 0,
  };

  const customersWithStatus = await Promise.all(
    customers.map(async (customer) => {
      const latestPayment = await getLatestPaymentForCustomer(
        customer._id.toString()
      );
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
    })
  );

  // Monthly totals
  const today = getTodayDateOnly();
  const currentMonthKey = getMonthBucket(today);
  const startWindow = `${currentMonthKey}-01`;
  const monthWindowCount = 12;
  const endWindow = addDaysDateOnly(
    addMonthsDateOnly(startWindow, monthWindowCount),
    -1
  );

  const paymentsInWindow = await listPaymentsForRevenueWindow(
    startWindow,
    endWindow
  );

  const monthBuckets = Array.from({ length: monthWindowCount }, (_, i) =>
    getMonthBucket(addMonthsDateOnly(startWindow, i))
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
    searchQuery,
  });
}

function StatusCard({
  title,
  count,
  bgClass,
  borderClass,
  textClass,
}: {
  title: string;
  count: number;
  bgClass: string;
  borderClass: string;
  textClass: string;
}) {
  return (
    <div
      className={`rounded-lg border-2 ${borderClass} ${bgClass} p-6`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${textClass}`}>{title}</p>
          <p className={`mt-1 text-3xl font-semibold ${textClass}`}>
            {count.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
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
    searchQuery,
  } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bảng điều khiển (Quản trị)
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý đăng ký và xem báo cáo doanh thu
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <StatusCard
          title="Tổng số thành viên"
          count={totalCustomers}
          bgClass="bg-gray-100"
          borderClass="border-gray-400"
          textClass="text-gray-900"
        />
        <StatusCard
          title="Còn hạn"
          count={statusCounts.active}
          bgClass="bg-green-100"
          borderClass="border-green-600"
          textClass="text-green-900"
        />
        <StatusCard
          title="Sắp đến hạn"
          count={statusCounts.due}
          bgClass="bg-yellow-100"
          borderClass="border-yellow-600"
          textClass="text-yellow-900"
        />
        <StatusCard
          title="Quá hạn (cao su)"
          count={statusCounts.grace}
          bgClass="bg-orange-100"
          borderClass="border-orange-600"
          textClass="text-orange-900"
        />
        <StatusCard
          title="Hết hạn"
          count={statusCounts.expired}
          bgClass="bg-red-100"
          borderClass="border-red-600"
          textClass="text-red-900"
        />
      </div>

      {/* Monthly Revenue Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Doanh thu theo tháng
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Tính toàn bộ số tiền vào tháng thanh toán (paidDate)
          </p>
        </div>
        <div className="p-6">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tháng
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng VND
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng USD
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng VND (Quy đổi)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {monthlyTotals.map((month) => (
                  <tr key={month.month}>
                    <td className="px-6 py-4 text-sm font-medium">
                      {formatMonth(month.month)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      {month.vnd > 0
                        ? `${month.vnd.toLocaleString("vi-VN")} ₫`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      {month.usd > 0 ? `$${month.usd.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-blue-700">
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

      {/* Customer List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Tất cả thành viên ({customers.length})
          </h2>
          <Link
            to="/826264/customers/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Thêm thành viên
          </Link>
        </div>
        <CustomerTable
          customers={customers}
          basePath="/826264/customers"
          showAdminActions={true}
        />
      </div>
    </div>
  );
}
