/**
 * PUBLIC HOME - Members List (View-Only)
 * 
 * Public page showing customer list with statuses.
 * No admin actions - view only.
 */

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";
import { listCustomers } from "~/models/customer.server";
import {
  getLatestPaymentForCustomer,
  computeStatus,
} from "~/models/payment.server";
import { getTodayDateOnly } from "~/utils/date";
import CustomerTable from "~/components/CustomerTable";

export const meta: MetaFunction = () => [
  { title: "Thành viên - Kana Box V2" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q") || "";

  // Get all customers (including hidden ones, we'll filter manually for renewal cancelled)
  const customers = await listCustomers(searchQuery, { publicOnly: false });

  const today = getTodayDateOnly();

  const customersWithStatus = await Promise.all(
    customers.map(async (customer) => {
      const latestPayment = await getLatestPaymentForCustomer(
        customer._id.toString()
      );
      const status = computeStatus(latestPayment?.endDate || null);
      
      // Check if customer should be hidden from public
      const isHidden = customer.isPublicHidden || 
        (customer.renewalCancelled && latestPayment?.endDate && today > latestPayment.endDate);
      
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
    })
  );

  // Filter out hidden customers for public view
  const publicCustomers = customersWithStatus.filter((c) => !c.isHidden);

  return json({
    customers: publicCustomers,
    searchQuery,
  });
}

export default function PublicHome() {
  const { customers, searchQuery } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thành viên</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tổng cộng có {customers.length} thành viên
        </p>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="font-medium text-gray-700">Màu trạng thái:</span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 rounded-full bg-green-200 mr-1"></span>
          Còn hạn
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 rounded-full bg-yellow-200 mr-1"></span>
          Sắp đến hạn
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 rounded-full bg-orange-200 mr-1"></span>
          Quá hạn (cao su)
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 rounded-full bg-red-200 mr-1"></span>
          Hết hạn
        </span>
      </div>

      {/* Customer Table - Public view (read-only, no links) */}
      <CustomerTable
        customers={customers}
        basePath="/customers"
        showAdminActions={false}
        readOnly={true}
      />
    </div>
  );
}
