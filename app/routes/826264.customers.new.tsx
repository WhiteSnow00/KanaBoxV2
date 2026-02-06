/**
 * Admin - Create Customer with Initial Payment
 * 
 * Single form to create customer + initial payment atomically.
 * Located at /826264/customers/new
 */

import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, json, useActionData, Form, Link } from "@remix-run/react";
import { useState } from "react";
import { ObjectId } from "mongodb";
import { MongoError } from "mongodb";
import { createCustomer, deleteCustomer } from "~/models/customer.server";
import { createPayment } from "~/models/payment.server";
import {
  calculateRecommendedMonths,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
} from "~/models/subscriptionStatus";
import { getTodayDateOnly } from "~/utils/date";

export const meta: MetaFunction = () => [
  { title: "Thêm thành viên - Quản trị - Kana Box V2" },
];

interface ActionData {
  errors?: {
    displayName?: string;
    amount?: string;
    months?: string;
    paidDate?: string;
    form?: string;
  };
  values?: {
    displayName: string;
    note: string;
    currency: string;
    amount: string;
    months: string;
    paidDate: string;
    paymentNote: string;
  };
  recommendedMonths?: number;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const displayName = String(formData.get("name") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const currency = String(formData.get("currency") || "VND") as "VND" | "USD";
  const amountStr = String(formData.get("amount") || "").trim();
  const monthsStr = String(formData.get("months") || "").trim();
  const paidDate = String(formData.get("paidDate") || "").trim();
  const paymentNote = String(formData.get("paymentNote") || "").trim();

  const errors: ActionData["errors"] = {};

  // Validate customer name
  if (!displayName) {
    errors.displayName = "Tên là bắt buộc";
  } else if (displayName.length < 1) {
    errors.displayName = "Tên tối thiểu 1 ký tự";
  } else if (displayName.length > 60) {
    errors.displayName = "Tên tối đa 60 ký tự";
  }

  // Validate amount
  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount <= 0) {
    errors.amount = "Số tiền phải là số dương";
  } else if (currency === "VND" && !Number.isInteger(amount)) {
    errors.amount = "Số tiền VND phải là số nguyên (không có phần thập phân)";
  }

  // Validate months
  const months = parseInt(monthsStr, 10);
  if (!monthsStr || isNaN(months) || months < 1) {
    errors.months = "Số tháng tối thiểu là 1";
  }

  // Validate paidDate
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!paidDate || !dateRegex.test(paidDate)) {
    errors.paidDate = "Vui lòng nhập ngày hợp lệ (YYYY-MM-DD)";
  }

  const recommendedMonths =
    amount > 0 && !isNaN(amount)
      ? calculateRecommendedMonths(amount, currency)
      : 1;

  if (Object.keys(errors).length > 0) {
    return json<ActionData>(
      {
        errors,
        values: {
          displayName,
          note,
          currency,
          amount: amountStr,
          months: monthsStr,
          paidDate,
          paymentNote,
        },
        recommendedMonths,
      },
      { status: 400 }
    );
  }

  // All validation passed - create customer and payment atomically
  let customerId: string | null = null;

  try {
    // Step 1: Create customer
    const customer = await createCustomer({ displayName, note: note || undefined });
    customerId = customer._id.toString();

    // Step 2: Create initial payment
    await createPayment({
      customerId,
      paidDate,
      currency,
      amount,
      months,
      note: paymentNote || undefined,
    });

    return redirect(`/826264/customers/${customerId}`);
  } catch (error) {
    // If payment creation failed but customer was created, rollback by deleting customer
    if (customerId) {
      try {
        await deleteCustomer(customerId);
      } catch (deleteError) {
        console.error("Failed to rollback customer creation:", deleteError);
      }
    }

    if (error instanceof MongoError && error.code === 11000) {
      return json<ActionData>(
        {
          errors: {
            displayName: "Đã có thành viên với tên này",
          },
          values: {
            displayName,
            note,
            currency,
            amount: amountStr,
            months: monthsStr,
            paidDate,
            paymentNote,
          },
          recommendedMonths,
        },
        { status: 400 }
      );
    }

    console.error("Error creating customer/payment:", error);
    return json<ActionData>(
      {
        errors: {
          form: "Tạo thành viên thất bại. Vui lòng thử lại.",
        },
        values: {
          displayName,
          note,
          currency,
          amount: amountStr,
          months: monthsStr,
          paidDate,
          paymentNote,
        },
        recommendedMonths,
      },
      { status: 500 }
    );
  }
}

export default function AdminAddCustomer() {
  const actionData = useActionData<ActionData>();

  const [currency, setCurrency] = useState<"VND" | "USD">(
    (actionData?.values?.currency as "VND" | "USD") || "VND"
  );
  const [amount, setAmount] = useState(
    parseFloat(actionData?.values?.amount || "0") || 0
  );
  const [monthsManuallyEdited, setMonthsManuallyEdited] = useState(false);

  const recommendedMonths = calculateRecommendedMonths(amount, currency);
  const [months, setMonths] = useState(
    parseInt(
      actionData?.values?.months || String(recommendedMonths) || "1",
      10
    ) || 1
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          to="/826264"
          className="text-sm text-blue-600 hover:text-blue-900"
        >
          ← Quay lại bảng điều khiển
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Thêm thành viên mới
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Create customer with initial payment
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <Form method="post" className="space-y-6 p-6">
          {actionData?.errors?.form && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{actionData.errors.form}</p>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Tên thành viên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              defaultValue={actionData?.values?.displayName || ""}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                actionData?.errors?.displayName ? "border-red-300" : ""
              }`}
              placeholder="Tên thành viên"
              maxLength={60}
              required
            />
            {actionData?.errors?.displayName ? (
              <p className="mt-1 text-sm text-red-600">
                {actionData.errors.displayName}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Phải duy nhất. 1–60 ký tự.
              </p>
            )}
          </div>

          {/* Customer Note */}
          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-gray-700"
            >
              Ghi chú thành viên
            </label>
            <textarea
              name="note"
              id="note"
              rows={2}
              defaultValue={actionData?.values?.note || ""}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Ghi chú (tùy chọn) về thành viên..."
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
            Thanh toán ban đầu
            </h2>

            {/* Currency */}
            <div className="mb-4">
              <label
                htmlFor="currency"
                className="block text-sm font-medium text-gray-700"
              >
                Tiền tệ <span className="text-red-500">*</span>
              </label>
              <select
                name="currency"
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "VND" | "USD")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              >
                <option value="VND">VND (₫)</option>
                <option value="USD">USD ($)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Giá cơ bản: {BASE_PRICE_VND.toLocaleString("vi-VN")} ₫/tháng hoặc
                ${BASE_PRICE_USD}/tháng
              </p>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700"
              >
                Số tiền <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">
                    {currency === "VND" ? "₫" : "$"}
                  </span>
                </div>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  min="1"
                  step={currency === "VND" ? "1" : "0.01"}
                  value={amount || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setAmount(val);
                    if (!monthsManuallyEdited) {
                      setMonths(calculateRecommendedMonths(val, currency));
                    }
                  }}
                  className={`block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    actionData?.errors?.amount ? "border-red-300" : ""
                  }`}
                  placeholder={currency === "VND" ? "50000" : "2.00"}
                  required
                />
              </div>
              {currency === "VND" && (
                <p className="mt-1 text-xs text-gray-500">
                  VND phải là số nguyên (không có phần thập phân)
                </p>
              )}
              {actionData?.errors?.amount && (
                <p className="mt-1 text-sm text-red-600">
                  {actionData.errors.amount}
                </p>
              )}
            </div>

            {/* Months */}
            <div className="mb-4">
              <label
                htmlFor="months"
                className="block text-sm font-medium text-gray-700"
              >
                Số tháng <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="months"
                id="months"
                min="1"
                step="1"
                value={months}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setMonths(val);
                  setMonthsManuallyEdited(true);
                }}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  actionData?.errors?.months ? "border-red-300" : ""
                }`}
                required
              />
              <p className="mt-1 text-sm text-gray-600">
                Gợi ý: <strong>{recommendedMonths}</strong> tháng (theo số tiền)
              </p>
            </div>

            {/* Paid Date */}
            <div className="mb-4">
              <label
                htmlFor="paidDate"
                className="block text-sm font-medium text-gray-700"
              >
                Ngày thanh toán <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="paidDate"
                id="paidDate"
                defaultValue={actionData?.values?.paidDate || getTodayDateOnly()}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  actionData?.errors?.paidDate ? "border-red-300" : ""
                }`}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Hết hạn: ngày thanh toán + số tháng (theo lịch)
              </p>
            </div>

            {/* Payment Note */}
            <div>
              <label
                htmlFor="paymentNote"
                className="block text-sm font-medium text-gray-700"
              >
                Ghi chú thanh toán
              </label>
              <textarea
                name="paymentNote"
                id="paymentNote"
                rows={2}
                defaultValue={actionData?.values?.paymentNote || ""}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Ghi chú (tùy chọn) về thanh toán..."
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <Link
              to="/826264"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Hủy
            </Link>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Tạo thành viên và thanh toán
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
