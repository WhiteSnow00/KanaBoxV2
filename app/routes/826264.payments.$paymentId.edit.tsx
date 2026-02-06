import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { redirect, json, useLoaderData, useActionData, Form, Link } from "@remix-run/react";
import { useState } from "react";
import { ObjectId } from "mongodb";
import { getPaymentById, updatePayment } from "~/models/payment.server";
import { getCustomerById } from "~/models/customer.server";
import {
  calculateRecommendedMonths,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
} from "~/models/subscriptionStatus";

const VND_AMOUNT_PRESETS = [50000, 100000, 150000, 200000, 250000, 300000] as const;

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `Sửa thanh toán - ${data?.customer.name || "Thành viên"} - Quản trị - Kana Box V2` },
];

interface LoaderData {
  payment: {
    _id: string;
    customerId: string;
    paidDate: string;
    currency: "VND" | "USD";
    amount: number;
    months: number;
    note?: string;
  };
  customer: {
    _id: string;
    name: string;
  };
}

interface ActionData {
  errors?: {
    amount?: string;
    months?: string;
    paidDate?: string;
    form?: string;
  };
  values?: {
    currency: string;
    amount: string;
    months: string;
    paidDate: string;
    note: string;
  };
  recommendedMonths?: number;
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { paymentId } = params;

  if (!paymentId || !ObjectId.isValid(paymentId)) {
    throw new Response("ID thanh toán không hợp lệ", { status: 400 });
  }

  const payment = await getPaymentById(paymentId);
  if (!payment) {
    throw new Response("Không tìm thấy thanh toán", { status: 404 });
  }

  const customer = await getCustomerById(payment.customerId.toString());
  if (!customer) {
    throw new Response("Không tìm thấy thành viên", { status: 404 });
  }

  return json<LoaderData>({
    payment: {
      _id: payment._id.toString(),
      customerId: payment.customerId.toString(),
      paidDate: payment.paidDate,
      currency: payment.currency,
      amount: payment.amount,
      months: payment.months,
      note: payment.note,
    },
    customer: {
      _id: customer._id.toString(),
      name: customer.displayName,
    },
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { paymentId } = params;

  if (!paymentId || !ObjectId.isValid(paymentId)) {
    throw new Response("ID thanh toán không hợp lệ", { status: 400 });
  }

  const formData = await request.formData();
  const currency = String(formData.get("currency") || "VND") as "VND" | "USD";
  const amountStr = String(formData.get("amount") || "").trim();
  const monthsStr = String(formData.get("months") || "").trim();
  const paidDate = String(formData.get("paidDate") || "").trim();
  const note = String(formData.get("note") || "").trim();

  const errors: ActionData["errors"] = {};

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

  const payment = await getPaymentById(paymentId);
  if (!payment) {
    return json<ActionData>(
      { errors: { form: "Không tìm thấy thanh toán" }, values: { currency, amount: amountStr, months: monthsStr, paidDate, note } },
      { status: 404 }
    );
  }

  try {
    await updatePayment({
      id: paymentId,
      paidDate,
      currency,
      amount,
      months,
      note: note || undefined,
    });

    return redirect(`/826264/customers/${payment.customerId.toString()}`);
  } catch (error) {
    console.error("Error updating payment:", error);
    return json<ActionData>(
      {
        errors: { form: "Cập nhật thanh toán thất bại. Vui lòng thử lại." },
        values: { currency, amount: amountStr, months: monthsStr, paidDate, note },
        recommendedMonths,
      },
      { status: 500 }
    );
  }
}

export default function AdminEditPayment() {
  const { payment, customer } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();

  const [currency, setCurrency] = useState<"VND" | "USD">(
    (actionData?.values?.currency as "VND" | "USD") || payment.currency
  );
  const [amount, setAmount] = useState(
    parseFloat(actionData?.values?.amount || String(payment.amount)) || 0
  );
  const [monthsManuallyEdited, setMonthsManuallyEdited] = useState(false);

  const recommendedMonths = calculateRecommendedMonths(amount, currency);
  const [months, setMonths] = useState(
    parseInt(
      actionData?.values?.months || String(payment.months),
      10
    ) || 1
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          to={`/826264/customers/${customer._id}`}
          className="text-sm text-blue-600 hover:text-blue-900"
        >
          ← Quay lại {customer.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Sửa thanh toán</h1>
        <p className="mt-1 text-sm text-gray-500">Thành viên: {customer.name}</p>
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
              Base price: {BASE_PRICE_VND.toLocaleString("en-US")} ₫/month or $
              {BASE_PRICE_USD}/month
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
              defaultValue={actionData?.values?.paidDate || payment.paidDate}
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
              defaultValue={actionData?.values?.note || payment.note || ""}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Ghi chú (tùy chọn) về thanh toán..."
            />
          </div>

          <div className="flex items-center justify-end gap-4">
            <Link
              to={`/826264/customers/${customer._id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Hủy
            </Link>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Lưu thay đổi
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
