import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { redirect, json, useLoaderData, useActionData, Form, Link } from "@remix-run/react";
import { useState } from "react";
import { ObjectId } from "mongodb";
import { ArrowLeft } from "lucide-react";
import { getPaymentById, updatePayment } from "~/models/payment.server";
import { getCustomerById } from "~/models/customer.server";
import {
  calculateRecommendedMonths,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
} from "~/models/subscriptionStatus";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to={`/826264/customers/${customer._id}`} className="text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          {customer.name}
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-900 font-medium">Sửa thanh toán</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sửa thanh toán</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">Thành viên: {customer.name}</p>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-5">
            {actionData?.errors?.form && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{actionData.errors.form}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currency">
                Tiền tệ <span className="text-red-500">*</span>
              </Label>
              <select
                name="currency"
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "VND" | "USD")}
                className="flex h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                required
              >
                <option value="VND">VND (₫)</option>
                <option value="USD">USD ($)</option>
              </select>
              <p className="text-xs text-zinc-400">
                Giá cơ bản: {BASE_PRICE_VND.toLocaleString("vi-VN")} ₫/tháng hoặc ${BASE_PRICE_USD}/tháng
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Số tiền <span className="text-red-500">*</span>
              </Label>
              {currency === "VND" && (
                <div className="flex flex-wrap gap-1.5">
                  {VND_AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAmount(preset);
                        if (!monthsManuallyEdited) {
                          setMonths(calculateRecommendedMonths(preset, currency));
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                        Math.round(amount) === preset
                          ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                          : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                      )}
                    >
                      {(preset / 1000)}k
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-zinc-400 text-sm">{currency === "VND" ? "₫" : "$"}</span>
                </div>
                <Input
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
                  className={cn("pl-7", actionData?.errors?.amount && "border-red-300 focus-visible:ring-red-500")}
                  placeholder={currency === "VND" ? "50000" : "2.00"}
                  required
                />
              </div>
              {currency === "VND" && (
                <p className="text-xs text-zinc-400">VND phải là số nguyên (không có phần thập phân)</p>
              )}
              {actionData?.errors?.amount && (
                <p className="text-sm text-red-600">{actionData.errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="months">
                Số tháng <span className="text-red-500">*</span>
              </Label>
              <Input
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
                className={actionData?.errors?.months ? "border-red-300 focus-visible:ring-red-500" : ""}
                required
              />
              <p className="text-xs text-zinc-500">
                Gợi ý: <span className="font-medium text-indigo-600">{recommendedMonths}</span> tháng (theo số tiền)
              </p>
              {actionData?.errors?.months && (
                <p className="text-sm text-red-600">{actionData.errors.months}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paidDate">
                Ngày thanh toán <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                name="paidDate"
                id="paidDate"
                defaultValue={actionData?.values?.paidDate || payment.paidDate}
                className={actionData?.errors?.paidDate ? "border-red-300 focus-visible:ring-red-500" : ""}
                required
              />
              {actionData?.errors?.paidDate && (
                <p className="text-sm text-red-600">{actionData.errors.paidDate}</p>
              )}
              <p className="text-xs text-zinc-400">
                Ngày hết hạn = ngày thanh toán + số tháng (theo lịch)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                name="note"
                id="note"
                rows={3}
                defaultValue={actionData?.values?.note || payment.note || ""}
                placeholder="Ghi chú (tùy chọn) về thanh toán..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link to={`/826264/customers/${customer._id}`}>Hủy</Link>
              </Button>
              <Button type="submit">Lưu thay đổi</Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
