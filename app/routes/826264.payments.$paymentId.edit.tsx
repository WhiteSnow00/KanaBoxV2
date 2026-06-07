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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
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

  const handleAmountPreset = (preset: number) => {
    setAmount(preset);
    if (!monthsManuallyEdited) {
      setMonths(calculateRecommendedMonths(preset, currency));
    }
  };

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <Breadcrumb items={[
        { label: customer.name, to: `/826264/customers/${customer._id}` },
        { label: "Sửa thanh toán" },
      ]} />

      <Card>
        <CardHeader>
          <CardTitle>Sửa thanh toán</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">Thành viên: {customer.name}</p>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-5">
            {actionData?.errors?.form && (
              <FormErrorBanner message={actionData.errors.form} />
            )}

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
              <FormMessage hint={`Giá cơ bản: ${BASE_PRICE_VND.toLocaleString("vi-VN")} ₫/tháng hoặc $${BASE_PRICE_USD}/tháng`} />
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
              {currency === "VND" && (
                <FormMessage hint="VND phải là số nguyên (không có phần thập phân)" />
              )}
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
                defaultValue={actionData?.values?.paidDate || payment.paidDate}
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
                defaultValue={actionData?.values?.note || payment.note || ""}
                placeholder="Ghi chú (tùy chọn) về thanh toán..."
              />
            </div>

            <FormActions>
              <Button variant="outline" asChild>
                <Link to={`/826264/customers/${customer._id}`}>Hủy</Link>
              </Button>
              <Button type="submit">Lưu thay đổi</Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
