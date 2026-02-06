import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import {
  redirect,
  json,
  useLoaderData,
  useActionData,
  Form,
  Link,
} from "@remix-run/react";
import { useState } from "react";
import { ObjectId } from "mongodb";
import { getCustomerById, listCustomers } from "~/models/customer.server";
import { createPayment } from "~/models/payment.server";
import {
  calculateRecommendedMonths,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
} from "~/models/subscriptionStatus";
import { getTodayDateOnly } from "~/utils/date";

const VND_AMOUNT_PRESETS = [50000, 100000, 150000, 200000, 250000, 300000] as const;

export const meta: MetaFunction = () => [
  { title: "Thêm thanh toán - Quản trị - Kana Box V2" },
];

interface LoaderData {
  customer: {
    _id: string;
    name: string;
  } | null;
  customers: Array<{
    _id: string;
    name: string;
  }>;
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
    currency: string;
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

  let customer = null;
  if (customerId && ObjectId.isValid(customerId)) {
    const c = await getCustomerById(customerId);
    if (c) {
      customer = {
        _id: c._id.toString(),
        name: c.displayName,
      };
    }
  }

  const allCustomers = await listCustomers();

  return json<LoaderData>({
    customer,
    customers: allCustomers.map((c) => ({
      _id: c._id.toString(),
      name: c.displayName,
    })),
    defaultPaidDate: getTodayDateOnly(),
    basePriceVnd: BASE_PRICE_VND,
    basePriceUsd: BASE_PRICE_USD,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const customerId = String(formData.get("customerId") || "").trim();
  const currency = String(formData.get("currency") || "VND") as "VND" | "USD";
  const amountStr = String(formData.get("amount") || "").trim();
  const monthsStr = String(formData.get("months") || "").trim();
  const paidDate = String(formData.get("paidDate") || "").trim();
  const note = String(formData.get("note") || "").trim();

  const errors: ActionData["errors"] = {};

  if (!customerId || !ObjectId.isValid(customerId)) {
    errors.customerId = "Vui lòng chọn thành viên hợp lệ";
  } else {
    const c = await getCustomerById(customerId);
    if (!c) {
      errors.customerId = "Không tìm thấy thành viên";
    }
  }

  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount <= 0) {
    errors.amount = "Số tiền phải là số dương";
  } else if (currency === "VND" && !Number.isInteger(amount)) {
    errors.amount = "Số tiền VND phải là số nguyên (không có phần thập phân)";
  }

  const months = parseInt(monthsStr, 10);
  if (!monthsStr || isNaN(months) || months < 1) {
    errors.months = "Số tháng tối thiểu là 1";
  }

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
          customerId,
          currency,
          amount: amountStr,
          months: monthsStr,
          paidDate,
          note,
        },
        recommendedMonths,
      },
      { status: 400 }
    );
  }

  try {
    await createPayment({
      customerId,
      paidDate,
      currency,
      amount,
      months,
      note: note || undefined,
    });

    return redirect(`/826264/customers/${customerId}`);
  } catch (error) {
    console.error("Error creating payment:", error);
    return json<ActionData>(
      {
        errors: {
          form: "Tạo thanh toán thất bại. Vui lòng thử lại.",
        },
        values: {
          customerId,
          currency,
          amount: amountStr,
          months: monthsStr,
          paidDate,
          note,
        },
        recommendedMonths,
      },
      { status: 500 }
    );
  }
}

export default function AdminAddPayment() {
  const { customer, customers, defaultPaidDate, basePriceVnd, basePriceUsd } =
    useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();

  const initialCurrency = (actionData?.values?.currency as "VND" | "USD") || "VND";
  const [currency, setCurrency] = useState<"VND" | "USD">(initialCurrency);
  const [amount, setAmount] = useState(() => {
    const parsed = actionData?.values?.amount
      ? parseFloat(actionData.values.amount)
      : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return initialCurrency === "USD" ? BASE_PRICE_USD : VND_AMOUNT_PRESETS[0];
  });
  const [monthsManuallyEdited, setMonthsManuallyEdited] = useState(false);

  const recommendedMonths = calculateRecommendedMonths(amount, currency);
  const [months, setMonths] = useState(
    parseInt(actionData?.values?.months || String(recommendedMonths) || "1", 10) || 1
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        {customer ? (
          <Link
            to={`/826264/customers/${customer._id}`}
            className="text-sm text-blue-600 hover:text-blue-900"
          >
            ← Quay lại {customer.name}
          </Link>
        ) : (
          <Link
            to="/826264"
            className="text-sm text-blue-600 hover:text-blue-900"
          >
            ← Quay lại bảng điều khiển
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Thêm thanh toán</h1>
      </div>

      <div className="bg-white shadow rounded-lg">
        <Form method="post" className="space-y-6 p-6">
          {actionData?.errors?.form && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{actionData.errors.form}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="customerId"
              className="block text-sm font-medium text-gray-700"
            >
              Thành viên <span className="text-red-500">*</span>
            </label>
            {customer ? (
              <>
                <input
                  type="hidden"
                  name="customerId"
                  value={customer._id}
                />
                <input
                  type="text"
                  value={customer.name}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 sm:text-sm"
                />
              </>
            ) : (
              <select
                name="customerId"
                id="customerId"
                defaultValue={actionData?.values?.customerId || ""}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  actionData?.errors?.customerId ? "border-red-300" : ""
                }`}
                required
              >
                <option value="">Chọn thành viên...</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {actionData?.errors?.customerId && (
              <p className="mt-1 text-sm text-red-600">
                {actionData.errors.customerId}
              </p>
            )}
          </div>

          <div>
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
              Giá cơ bản: {basePriceVnd.toLocaleString("vi-VN")} ₫/tháng hoặc $
              {basePriceUsd}/tháng
            </p>
          </div>

          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700"
            >
              Số tiền <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {currency === "VND" && (
                <select
                  id="amountPreset"
                  value={
                    VND_AMOUNT_PRESETS.includes(
                      Math.round(amount) as (typeof VND_AMOUNT_PRESETS)[number]
                    )
                      ? String(Math.round(amount))
                      : "custom"
                  }
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === "custom") return;
                    const nextAmount = parseInt(next, 10) || 0;
                    setAmount(nextAmount);
                    if (!monthsManuallyEdited) {
                      setMonths(calculateRecommendedMonths(nextAmount, currency));
                    }
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="50000">50k</option>
                  <option value="100000">100k</option>
                  <option value="150000">150k</option>
                  <option value="200000">200k</option>
                  <option value="250000">250k</option>
                  <option value="300000">300k</option>
                  <option value="custom">Tùy chỉnh</option>
                </select>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">
                    {currency === "VND" ? "₫" : "$"}
                  </span>
                </div>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  min={currency === "VND" ? "1" : "0.01"}
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
            </div>
            {actionData?.errors?.amount && (
              <p className="mt-1 text-sm text-red-600">
                {actionData.errors.amount}
              </p>
            )}
          </div>

          <div>
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
            {actionData?.errors?.months && (
              <p className="mt-1 text-sm text-red-600">
                {actionData.errors.months}
              </p>
            )}
          </div>

          <div>
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
              defaultValue={actionData?.values?.paidDate || defaultPaidDate}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                actionData?.errors?.paidDate ? "border-red-300" : ""
              }`}
              required
            />
            {actionData?.errors?.paidDate && (
              <p className="mt-1 text-sm text-red-600">
                {actionData.errors.paidDate}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Ngày hết hạn = ngày thanh toán + số tháng (theo lịch)
            </p>
          </div>

          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-gray-700"
            >
              Ghi chú
            </label>
            <textarea
              name="note"
              id="note"
              rows={3}
              defaultValue={actionData?.values?.note || ""}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Ghi chú (tùy chọn) về thanh toán..."
            />
          </div>

          <div className="flex items-center justify-end gap-4">
            <Link
              to={
                customer
                  ? `/826264/customers/${customer._id}`
                  : "/826264"
              }
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Hủy
            </Link>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Lưu thanh toán
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
