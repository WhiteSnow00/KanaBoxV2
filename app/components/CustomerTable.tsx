import { Link } from "@remix-run/react";

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

interface CustomerTableProps {
  customers: CustomerWithStatus[];
  basePath: string;
  showAdminActions?: boolean;
  readOnly?: boolean;
}

function StatusBadge({
  status,
  label,
}: {
  status: CustomerWithStatus["status"]["status"];
  label: string;
}) {
  const badgeClasses = {
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

function HiddenBadge() {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-500 ml-2"
      title="Ẩn khỏi trang công khai"
    >
      Ẩn
    </span>
  );
}

function getRowClass(status: CustomerWithStatus["status"]["status"]): string {
  const classes = {
    active: "bg-green-50",
    due: "bg-yellow-50",
    grace: "bg-orange-50",
    expired: "bg-red-50",
    none: "bg-white",
  };
  return classes[status];
}

export default function CustomerTable({
  customers,
  basePath,
  showAdminActions = false,
  readOnly = false,
}: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">Chưa có thành viên nào</p>
        {showAdminActions && (
          <p className="mt-1">Bắt đầu bằng cách thêm thành viên đầu tiên</p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tên
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trạng thái
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ngày hết hạn
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thanh toán gần nhất
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Số tháng
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ghi chú
            </th>
            {!readOnly && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {customers.map(({ customer, latestPayment, status }) => (
            <tr
              key={customer._id}
              className={`${getRowClass(status.status)} hover:opacity-80 transition-opacity`}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {readOnly ? (
                  <span className="font-medium text-gray-900">
                    {customer.name}
                  </span>
                ) : (
                  <Link
                    to={`${basePath}/${customer._id}`}
                    className="font-medium text-blue-600 hover:text-blue-900"
                  >
                    {customer.name}
                  </Link>
                )}
                {!readOnly && customer.isPublicHidden && <HiddenBadge />}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <StatusBadge status={status.status} label={status.label} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {latestPayment ? (
                  <span
                    className={
                      status.status === "expired"
                        ? "text-red-600 font-medium"
                        : ""
                    }
                  >
                    {latestPayment.endDate}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {latestPayment ? (
                  <>
                    {latestPayment.currency === "VND"
                      ? `${Math.round(latestPayment.amount).toLocaleString("vi-VN")} ₫`
                      : `$${latestPayment.amount.toFixed(2)}`}
                  </>
                ) : (
                  <span className="text-gray-400">Chưa có thanh toán</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {latestPayment ? (
                  <>
                    {latestPayment.months} tháng
                  </>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {(customer.note || latestPayment?.note) ? (
                  <span
                    className="inline-flex items-center text-gray-500"
                    title={[customer.note, latestPayment?.note]
                      .filter(Boolean)
                      .join(" | ")}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </span>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              {!readOnly && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <Link
                    to={`${basePath}/${customer._id}`}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Xem →
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
