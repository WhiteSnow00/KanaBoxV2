/**
 * Admin Customer Detail Route
 * 
 * Shows customer details with admin actions:
 * - Edit customer (name, note)
 * - Delete customer
 * - Add payment
 * - Edit/Delete payments
 * - Cancel Renewal (Hide/Unhide from public)
 * - Full payment history
 */

import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData, useOutlet, Link, Form, redirect } from "@remix-run/react";
import { ObjectId } from "mongodb";
import { 
  getCustomerById, 
  hideCustomerFromPublic, 
  unhideCustomer,
  deleteCustomerWithPayments,
  cancelRenewal,
  resumeRenewal,
  type Customer,
} from "~/models/customer.server";
import { listPaymentsForCustomer, deletePayment } from "~/models/payment.server";
import { computeStatus } from "~/models/subscriptionStatus";

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
    await deleteCustomerWithPayments(customerId);
    return redirect("/826264");
  } else if (intent === "deletePayment") {
    const paymentId = String(formData.get("paymentId") || "");
    if (paymentId && ObjectId.isValid(paymentId)) {
      await deletePayment(paymentId);
    }
    return redirect(`/826264/customers/${customerId}`);
  }

  return redirect(`/826264/customers/${customerId}`);
}

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const badgeClasses: Record<string, string> = {
    active: "bg-green-100 text-green-800 border border-green-600",
    due: "bg-yellow-100 text-yellow-800 border border-yellow-600",
    grace: "bg-orange-100 text-orange-800 border border-orange-600",
    expired: "bg-red-100 text-red-800 border border-red-600",
    none: "bg-gray-100 text-gray-800 border border-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClasses[status]}`}
    >
      {label}
    </span>
  );
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === "VND") {
    return `${amount.toLocaleString("vi-VN")} ₫`;
  }
  return `$${amount.toFixed(2)}`;
}

export default function AdminCustomerDetail() {
  const outlet = useOutlet();
  const { customer, payments, latestStatus } = useLoaderData<typeof loader>();

  if (outlet) {
    return outlet;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          to="/826264"
          className="text-sm text-blue-600 hover:text-blue-900"
        >
          ← Quay lại bảng điều khiển
        </Link>
      </div>

      {/* Customer Header */}
      <div
        className={`bg-white shadow rounded-lg overflow-hidden ${
          latestStatus.status === "none"
            ? ""
            : latestStatus.status === "active"
            ? "border-l-4 border-l-green-500"
            : latestStatus.status === "due"
            ? "border-l-4 border-l-yellow-500"
            : latestStatus.status === "grace"
            ? "border-l-4 border-l-orange-500"
            : "border-l-4 border-l-red-500"
        }`}
      >
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {customer.name}
                </h1>
                {customer.isPublicHidden && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-500">
                    Ẩn công khai
                  </span>
                )}
                {customer.renewalCancelled && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-500">
                    Đã hủy gia hạn
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={latestStatus.status} label={latestStatus.label} />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              {/* Cancel/Resume Renewal Controls */}
              {customer.renewalCancelled ? (
                <Form method="post" className="inline">
                  <input type="hidden" name="intent" value="resumeRenewal" />
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    title="Re-enable automatic renewal"
                  >
                    Bật lại gia hạn
                  </button>
                </Form>
              ) : (
                <Form method="post" className="inline">
                  <input type="hidden" name="intent" value="cancelRenewal" />
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 cursor-pointer"
                    title="Hủy gia hạn - thành viên sẽ bị ẩn công khai sau khi hết hạn"
                  >
                    Hủy gia hạn
                  </button>
                </Form>
              )}
              
              {/* Hide/Unhide Controls */}
              {customer.isPublicHidden ? (
                <Form method="post" className="inline">
                  <input type="hidden" name="intent" value="unhide" />
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Hiện công khai
                  </button>
                </Form>
              ) : (
                <Form method="post" className="inline">
                  <input type="hidden" name="intent" value="hide" />
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                    title="Ẩn khỏi trang công khai ngay lập tức"
                  >
                    Ẩn công khai
                  </button>
                </Form>
              )}
              <Link
                to={`/826264/customers/${customer._id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Sửa thành viên
              </Link>
              <Link
                to={`/826264/payments/new?customerId=${customer._id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Thêm thanh toán
              </Link>
              <Form 
                method="post" 
                className="inline"
                onSubmit={(e) => {
                  if (!confirm("Bạn có chắc muốn xóa thành viên này và toàn bộ thanh toán của họ không? Thao tác này không thể hoàn tác.")) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="intent" value="deleteCustomer" />
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  Xóa thành viên
                </button>
              </Form>
            </div>
          </div>

          {/* Customer Note */}
          {customer.note && (
            <div className="mt-4 bg-gray-50 rounded-md p-4">
              <h3 className="text-sm font-medium text-gray-700">Ghi chú</h3>
              <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                {customer.note}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Lịch sử thanh toán</h2>
        </div>
        <div className="p-0">
          {payments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">Chưa có thanh toán</p>
              <div className="mt-4">
                <Link
                  to={`/826264/payments/new?customerId=${customer._id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Thêm thanh toán đầu tiên
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày thanh toán
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày hết hạn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số tháng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ghi chú
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment, index) => {
                    const paymentStatus = computeStatus(payment.endDate);
                    const isLatest = index === 0;

                    return (
                      <tr
                        key={payment._id}
                        className={isLatest ? "bg-blue-50" : ""}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.paidDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.endDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.months}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={paymentStatus.status}
                              label={paymentStatus.label}
                            />
                            {isLatest && (
                              <span className="text-xs text-blue-600 font-medium">
                                (hiện tại)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {payment.note || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/826264/payments/${payment._id}/edit`}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Sửa
                            </Link>
                            <Form 
                              method="post" 
                              className="inline"
                              onSubmit={(e) => {
                                if (!confirm("Bạn có chắc muốn xóa thanh toán này không?")) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <input type="hidden" name="intent" value="deletePayment" />
                              <input type="hidden" name="paymentId" value={payment._id} />
                              <button
                                type="submit"
                                className="text-red-600 hover:text-red-900 font-medium"
                              >
                                Xóa
                              </button>
                            </Form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
