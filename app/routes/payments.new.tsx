/**
 * Add Payment Route
 * 
 * Form to create a new payment with:
 * - Customer selection (from query param or dropdown)
 * - Currency selection (VND default / USD)
 * - Amount input with recommended months calculation
 * - Months input (editable, default from recommendation)
 * - Paid date (defaults to today)
 * - Cancel requested checkbox
 * - Note textarea
 * 
 * Progressive enhancement: Works without JavaScript.
 * With JavaScript: Auto-updates recommended months as amount changes.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, json, useLoaderData, useActionData, Form, Link } from "@remix-run/react";
import { useState, useEffect } from "react";
import { ObjectId } from "mongodb";
import { getCustomerById, listCustomers, type Customer } from "~/models/customer.server";
import { createPayment } from "~/models/payment.server";
import {
  calculateRecommendedMonths,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
  type Currency,
} from "~/models/subscriptionStatus";
import { getTodayDateOnly } from "~/utils/date";

export const meta: MetaFunction = () => [
  { title: "Thêm thanh toán - Kana Box V2" },
];

interface LoaderData {
  customer: Customer | null;
  customers: Customer[];
  defaultPaidDate: string;
  basePriceVnd: number;
  basePriceUsd: number;
}

interface ActionData {
  errors?: {
    customerId?: string;
    amount?: string;
    months?: string;
    paidDate?: string;
    form?: string;
  };
  values?: {
    customerId: string;
    currency: Currency;
    amount: string;
    months: string;
    paidDate: string;
    note: string;
  };
  recommendedMonths?: number;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  let customer: Customer | null = null;
  if (customerId && ObjectId.isValid(customerId)) {
    customer = await getCustomerById(customerId);
  }

  // Get all customers for the dropdown (in case customerId is not provided)
  const customers = await listCustomers();

  return json<LoaderData>({
    customer,
    customers,
    defaultPaidDate: getTodayDateOnly(),
    basePriceVnd: BASE_PRICE_VND,
    basePriceUsd: BASE_PRICE_USD,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const customerId = String(formData.get("customerId") || "").trim();
  const currency = String(formData.get("currency") || "VND") as Currency;
  const amountStr = String(formData.get("amount") || "").trim();
  const monthsStr = String(formData.get("months") || "").trim();
  const paidDate = String(formData.get("paidDate") || "").trim();
  const note = String(formData.get("note") || "").trim();

  const errors: ActionData["errors"] = {};

  // Validate customerId
  if (!customerId || !ObjectId.isValid(customerId)) {
    errors.customerId = "Vui lòng chọn thành viên hợp lệ";
  } else {
    const customer = await getCustomerById(customerId);
    if (!customer) {
      errors.customerId = "Không tìm thấy thành viên";
    }
  }

  // Validate amount
  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount <= 0) {
    errors.amount = "Số tiền phải là số dương";
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

  // Calculate recommended months for display hint
  const recommendedMonths = amount > 0 && !isNaN(amount)
    ? calculateRecommendedMonths(amount, currency)
    : 1;

  if (Object.keys(errors).length > 0) {
    return json<ActionData>({
      errors,
      values: {
        customerId,
        currency: currency as Currency,
        amount: amountStr,
        months: monthsStr,
        paidDate,
        note,
      },
      recommendedMonths,
    }, { status: 400 });
  }

  try {
    await createPayment({
      customerId,
      paidDate,
      currency: currency as Currency,
      amount,
      months,
      note: note || undefined,
    });

    return redirect(`/customers/${customerId}`);
  } catch (error) {
    console.error("Error creating payment:", error);
    return json<ActionData>({
      errors: {
        form: "Tạo thanh toán thất bại. Vui lòng thử lại.",
      },
      values: {
        customerId,
        currency: currency as Currency,
        amount: amountStr,
        months: monthsStr,
        paidDate,
        note,
      },
      recommendedMonths,
    }, { status: 500 });
  }
}

/**
 * Client-side hook to calculate recommended months
 */
function useRecommendedMonths(amount: number, currency: Currency): number {
  return calculateRecommendedMonths(amount, currency);
}

export default function AddPayment() {
  const { customer, customers, defaultPaidDate, basePriceVnd, basePriceUsd } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  // Form state for client-side calculations
  const [currency, setCurrency] = useState<Currency>(
    actionData?.values?.currency || "VND"
  );
  const [amount, setAmount] = useState(
    parseFloat(actionData?.values?.amount || "0") || 0
  );
  const [months, setMonths] = useState(
    parseInt(actionData?.values?.months || "1", 10) || 1
  );

  // Update recommended months when amount or currency changes
  const recommendedMonths = useRecommendedMonths(amount, currency);

  // Sync with server-side recommended months on initial load
  useEffect(() => {
    if (actionData?.recommendedMonths && !actionData?.values?.months) {
      setMonths(actionData.recommendedMonths);
    }
  }, [actionData?.recommendedMonths]);

  // Update months when recommended changes (if user hasn't manually edited)
  const [monthsManuallyEdited, setMonthsManuallyEdited] = useState(false);

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        {customer ? (
          <Link
            to={`/customers/${customer._id.toString()}`}
            className="text-sm text-blue-600 hover:text-blue-900"
          >
            ← Quay lại {customer.displayName}
          </Link>
        ) : (
          <Link to="/customers" className="text-sm text-blue-600 hover:text-blue-900">
            ← Quay lại danh sách thành viên
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Thêm thanh toán</h1>
      </div>

      {/* Form */}
      <div className="card">
        <Form method="post" className="space-y-6 card-body">
          {actionData?.errors?.form && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{actionData.errors.form}</p>
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label htmlFor="customerId" className="form-label">
              Thành viên <span className="text-red-500">*</span>
            </label>
            {customer ? (
              // Pre-selected customer
              <>
                <input type="hidden" name="customerId" value={customer._id.toString()} />
                <input
                  type="text"
                  value={customer.displayName}
                  disabled
                  className="form-input mt-1 bg-gray-100"
                />
              </>
            ) : (
              // Dropdown for customer selection
              <select
                name="customerId"
                id="customerId"
                defaultValue={actionData?.values?.customerId || ""}
                className={`form-input mt-1 ${
                  actionData?.errors?.customerId ? "border-red-300" : ""
                }`}
                required
              >
                <option value="">Chọn thành viên...</option>
                {customers.map((c) => (
                  <option key={c._id.toString()} value={c._id.toString()}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            )}
            {actionData?.errors?.customerId && (
              <p className="form-error">{actionData.errors.customerId}</p>
            )}
          </div>

          {/* Currency Selection */}
          <div>
            <label htmlFor="currency" className="form-label">
              Tiền tệ <span className="text-red-500">*</span>
            </label>
            <select
              name="currency"
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="form-input mt-1"
              required
            >
              <option value="VND">VND (₫)</option>
              <option value="USD">USD ($)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Giá cơ bản: {basePriceVnd.toLocaleString("vi-VN")} ₫/tháng hoặc ${basePriceUsd}/tháng
            </p>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="form-label">
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
                min="0.01"
                step={currency === "VND" ? "1000" : "0.01"}
                value={amount || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setAmount(val);
                  if (!monthsManuallyEdited) {
                    setMonths(calculateRecommendedMonths(val, currency));
                  }
                }}
                className={`form-input pl-7 ${
                  actionData?.errors?.amount ? "border-red-300" : ""
                }`}
                placeholder="0.00"
                required
              />
            </div>
            {actionData?.errors?.amount && (
              <p className="form-error">{actionData.errors.amount}</p>
            )}
          </div>

          {/* Months */}
          <div>
            <label htmlFor="months" className="form-label">
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
              className={`form-input mt-1 ${
                actionData?.errors?.months ? "border-red-300" : ""
              }`}
              required
            />
            <p className="mt-1 text-sm text-gray-600">
              Gợi ý: <strong>{recommendedMonths}</strong> tháng (theo số tiền)
            </p>
            {actionData?.errors?.months && (
              <p className="form-error">{actionData.errors.months}</p>
            )}
          </div>

          {/* Paid Date */}
          <div>
            <label htmlFor="paidDate" className="form-label">
              Ngày thanh toán <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="paidDate"
              id="paidDate"
              defaultValue={actionData?.values?.paidDate || defaultPaidDate}
              className={`form-input mt-1 ${
                actionData?.errors?.paidDate ? "border-red-300" : ""
              }`}
              required
            />
            {actionData?.errors?.paidDate && (
              <p className="form-error">{actionData.errors.paidDate}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Ngày hết hạn = ngày thanh toán + số tháng (theo lịch)
            </p>
          </div>

          {/* Cancel Requested */}
          {/* Note */}
          <div>
            <label htmlFor="note" className="form-label">
              Ghi chú
            </label>
            <textarea
              name="note"
              id="note"
              rows={3}
              defaultValue={actionData?.values?.note || ""}
              className="form-input mt-1"
              placeholder="Ghi chú (tùy chọn) về thanh toán..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <Link
              to={customer ? `/customers/${customer._id.toString()}` : "/customers"}
              className="btn-secondary"
            >
              Hủy
            </Link>
            <button type="submit" className="btn-primary">
              Lưu thanh toán
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
