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
import { createPayment, getLatestPaymentForCustomer } from "~/models/payment.server";
import {
  calculateRecommendedMonths,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
  computeStatus,
} from "~/models/subscriptionStatus";
import { getTodayDateOnly, isValidDateOnly } from "~/utils/date";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import {
  Breadcrumb,
  FormErrorBanner,
  FormMessage,
  FormActions,
  CurrencySelect,
  AmountPresetChips,
  CurrencyAmountInput,
  MonthsRecommendation,
} from "~/components/shared";

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
  currentSubscription: {
    expiry: string;
    statusText: string;
  } | null;
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

function formatStatusContext(status: ReturnType<typeof computeStatus>): string {
  if (status.daysToEnd !== null) {
    if (status.daysToEnd === 0) {
      return `${status.label} (hôm nay)`;
    }
    return `${status.label} (${status.daysToEnd} ngày còn lại)`;
  }

  if (status.daysPastEnd !== null) {
    return `${status.label} (${status.daysPastEnd} ngày quá hạn)`;
  }

  return status.label;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  let customer = null;
  let defaultPaidDate = getTodayDateOnly();
  let currentSubscription: LoaderData["currentSubscription"] = null;

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
        const status = computeStatus(latestPayment.endDate);
        currentSubscription = {
          expiry: latestPayment.endDate,
          statusText: formatStatusContext(status),
        };
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
    currentSubscription,
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

  if (!paidDate || !isValidDateOnly(paidDate)) {
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
  const { customer, customers, defaultPaidDate, currentSubscription, basePriceVnd, basePriceUsd } =
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
    return initialCurrency === "USD" ? BASE_PRICE_USD : 50000;
  });
  const [monthsManuallyEdited, setMonthsManuallyEdited] = useState(false);

  const recommendedMonths = calculateRecommendedMonths(amount, currency);
  const [months, setMonths] = useState(
    parseInt(actionData?.values?.months || String(recommendedMonths) || "1", 10) || 1
  );

  const handleAmountPreset = (preset: number) => {
    setAmount(preset);
    if (!monthsManuallyEdited) {
      setMonths(calculateRecommendedMonths(preset, currency));
    }
  };

  const breadcrumbItems = customer
    ? [{ label: customer.name, to: `/826264/customers/${customer._id}` }, { label: "Thêm thanh toán" }]
    : [{ label: "Bảng điều khiển", to: "/826264" }, { label: "Thêm thanh toán" }];

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <Breadcrumb items={breadcrumbItems} />

      <Card>
        <CardHeader>
          <CardTitle>Thêm thanh toán</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-5">
            {actionData?.errors?.form && (
              <FormErrorBanner message={actionData.errors.form} />
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
                    "flex h-10 w-full rounded-md border bg-white/95 px-3 py-2 text-sm text-zinc-900 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-zinc-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus-visible:border-indigo-400 dark:focus-visible:ring-indigo-400/10",
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
              <FormMessage error={actionData?.errors?.customerId} />
              {customer && (
                <div className="animate-scale-fade rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-indigo-200">
                  {currentSubscription ? (
                    <>
                      Hết hạn hiện tại: <span className="font-medium tabular-nums">{currentSubscription.expiry}</span>
                      <span className="mx-1 text-indigo-300">·</span>
                      Trạng thái: <span className="font-medium">{currentSubscription.statusText}</span>
                    </>
                  ) : (
                    "Thành viên này chưa có thanh toán hiện tại."
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">
                Tiền tệ <span className="text-red-500">*</span>
              </Label>
              <CurrencySelect
                name="currency"
                id="currency"
                value={currency}
                onChange={setCurrency}
              />
              <FormMessage hint={`Giá cơ bản: ${basePriceVnd.toLocaleString("vi-VN")} ₫/tháng hoặc $${basePriceUsd}/tháng`} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Số tiền <span className="text-red-500">*</span>
              </Label>
              {currency === "VND" && (
                <AmountPresetChips currentAmount={amount} onSelect={handleAmountPreset} />
              )}
              <CurrencyAmountInput
                currency={currency}
                name="amount"
                id="amount"
                value={amount || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setAmount(val);
                  if (!monthsManuallyEdited) {
                    setMonths(calculateRecommendedMonths(val, currency));
                  }
                }}
                error={!!actionData?.errors?.amount}
              />
              <FormMessage error={actionData?.errors?.amount} />
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
              <MonthsRecommendation months={recommendedMonths} />
              <FormMessage error={actionData?.errors?.months} />
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
              <FormMessage
                error={actionData?.errors?.paidDate}
                hint={actionData?.errors?.paidDate ? undefined : "Ngày hết hạn = ngày thanh toán + số tháng (theo lịch)"}
              />
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

            <FormActions>
              <Button variant="outline" asChild>
                <Link to={customer ? `/826264/customers/${customer._id}` : "/826264"}>Hủy</Link>
              </Button>
              <Button type="submit">Lưu thanh toán</Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
