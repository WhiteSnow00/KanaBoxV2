import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, json, useActionData, Form, Link } from "@remix-run/react";
import { useState } from "react";
import {
  createCustomer,
  findArchivedByName,
  unarchiveCustomer,
  customerExistsByDisplayName,
} from "~/models/customer.server";
import { createPayment } from "~/models/payment.server";
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
import { Separator } from "~/components/ui/separator";
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

  if (!displayName) {
    errors.displayName = "Tên là bắt buộc";
  } else if (displayName.length < 1) {
    errors.displayName = "Tên tối thiểu 1 ký tự";
  } else if (displayName.length > 60) {
    errors.displayName = "Tên tối đa 60 ký tự";
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

  try {
    const archived = await findArchivedByName(displayName);

    if (archived) {
      const customerId = archived._id.toString();
      await unarchiveCustomer(customerId, note || undefined);

      await createPayment({
        customerId,
        paidDate,
        currency,
        amount,
        months,
        note: paymentNote || undefined,
      });

      return redirect(`/826264/customers/${customerId}`);
    }

    const activeExists = await customerExistsByDisplayName(displayName);
    if (activeExists) {
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

    const customer = await createCustomer({ displayName, note: note || undefined });
    const customerId = customer._id.toString();

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
    parseInt(
      actionData?.values?.months || String(recommendedMonths) || "1",
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
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: "Bảng điều khiển", to: "/826264" },
        { label: "Thêm thành viên" },
      ]} />

      <Card>
        <CardHeader>
          <CardTitle>Thêm thành viên mới</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">Tạo thành viên kèm thanh toán ban đầu</p>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-5">
            {actionData?.errors?.form && (
              <FormErrorBanner message={actionData.errors.form} />
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Tên thành viên <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  name="name"
                  id="name"
                  defaultValue={actionData?.values?.displayName || ""}
                  className={actionData?.errors?.displayName ? "border-red-300 focus-visible:ring-red-500" : ""}
                  placeholder="Tên thành viên"
                  maxLength={60}
                  required
                />
                <FormMessage
                  error={actionData?.errors?.displayName}
                  hint={actionData?.errors?.displayName ? undefined : "Phải duy nhất. 1–60 ký tự."}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Ghi chú thành viên</Label>
                <Textarea
                  name="note"
                  id="note"
                  rows={2}
                  defaultValue={actionData?.values?.note || ""}
                  placeholder="Ghi chú (tùy chọn) về thành viên..."
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900">Thanh toán ban đầu</h3>

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
                  defaultValue={actionData?.values?.paidDate || getTodayDateOnly()}
                  className={actionData?.errors?.paidDate ? "border-red-300 focus-visible:ring-red-500" : ""}
                  required
                />
                <FormMessage
                  error={actionData?.errors?.paidDate}
                  hint={actionData?.errors?.paidDate ? undefined : "Hết hạn = ngày thanh toán + số tháng (theo lịch)"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentNote">Ghi chú thanh toán</Label>
                <Textarea
                  name="paymentNote"
                  id="paymentNote"
                  rows={2}
                  defaultValue={actionData?.values?.paymentNote || ""}
                  placeholder="Ghi chú (tùy chọn) về thanh toán..."
                />
              </div>
            </div>

            <Separator />

            <FormActions>
              <Button variant="outline" asChild>
                <Link to="/826264">Hủy</Link>
              </Button>
              <Button type="submit">Tạo thành viên và thanh toán</Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
