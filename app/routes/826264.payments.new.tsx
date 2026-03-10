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
import { ArrowLeft } from "lucide-react";
import { getCustomerById, listCustomers } from "~/models/customer.server";
import { createPayment, getLatestPaymentForCustomer } from "~/models/payment.server";
import {
  calculateRecommendedMonths,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
} from "~/models/subscriptionStatus";
import { getTodayDateOnly } from "~/utils/date";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

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
  let defaultPaidDate = getTodayDateOnly();

  if (customerId && ObjectId.isValid(customerId)) {
    const c = await getCustomerById(customerId);
    if (c) {
      customer = {
        _id: c._id.toString(),
        name: c.displayName,
      };
      const latestPayment = await getLatestPaymentForCustomer(customerId);
      if (latestPayment) {
        defaultPaidDate = latestPayment.endDate;
      }
    }
  }

  const allCustomers = await listCustomers();

  return json<LoaderData>({
    customer,
    customers: allCustomers.map((c) => ({
      _id: c._id.toString(),
      name: c.displayName,
    })),
    defaultPaidDate,
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        {customer ? (
          <Link to={`/826264/customers/${customer._id}`} className="text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            {customer.name}
          </Link>
        ) : (
          <Link to="/826264" className="text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Bảng điều khiển
          </Link>
        )}
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-900 font-medium">Thêm thanh toán</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thêm thanh toán</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-5">
            {actionData?.errors?.form && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{actionData.errors.form}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customerId">
                Thành viên <span className="text-red-500">*</span>
              </Label>
              {customer ? (
                <>
                  <input type="hidden" name="customerId" value={customer._id} />
                  <Input type="text" value={customer.name} disabled className="bg-zinc-50" />
                </>
              ) : (
                <select
                  name="customerId"
                  id="customerId"
                  defaultValue={actionData?.values?.customerId || ""}
                  className={cn(
                    "flex h-9 w-full rounded-lg border bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500",
                    actionData?.errors?.customerId ? "border-red-300" : "border-zinc-300"
                  )}
                  required
                >
                  <option value="">Chọn thành viên...</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              )}
              {actionData?.errors?.customerId && (
                <p className="text-sm text-red-600">{actionData.errors.customerId}</p>
              )}
            </div>

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
                Giá cơ bản: {basePriceVnd.toLocaleString("vi-VN")} ₫/tháng hoặc ${basePriceUsd}/tháng
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
                defaultValue={actionData?.values?.paidDate || defaultPaidDate}
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
                defaultValue={actionData?.values?.note || ""}
                placeholder="Ghi chú (tùy chọn) về thanh toán..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link to={customer ? `/826264/customers/${customer._id}` : "/826264"}>Hủy</Link>
              </Button>
              <Button type="submit">Lưu thanh toán</Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
