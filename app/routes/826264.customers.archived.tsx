import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { ObjectId } from "mongodb";
import { Archive, RefreshCw } from "lucide-react";
import { getCustomerById, listCustomers, unarchiveCustomer } from "~/models/customer.server";
import { createPayment, listLatestPaymentsForAllCustomers } from "~/models/payment.server";
import {
  BASE_PRICE_USD,
  BASE_PRICE_VND,
  calculateRecommendedMonths,
  computeStatus,
  type Currency,
} from "~/models/subscriptionStatus";
import { getTodayDateOnly } from "~/utils/date";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  AmountPresetChips,
  Breadcrumb,
  CurrencyAmountInput,
  CurrencySelect,
  EmptyState,
  FormErrorBanner,
  FormMessage,
  MonthsRecommendation,
  PageHeader,
  formatCurrency,
} from "~/components/shared";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () => [
  { title: "Thành viên lưu trữ - Quản trị - Kana Box V2" },
];

const statusVariant: Record<string, "active" | "due" | "grace" | "expired" | "none"> = {
  active: "active",
  due: "due",
  grace: "grace",
  expired: "expired",
  none: "none",
};

function serializeArchivedAt(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

interface ActionData {
  error?: string;
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

export async function loader({}: LoaderFunctionArgs) {
  const [customers, latestPaymentsMap] = await Promise.all([
    listCustomers(undefined, { includeArchived: true }),
    listLatestPaymentsForAllCustomers(),
  ]);

  const archivedCustomers = customers
    .filter((customer) => customer.isArchived)
    .map((customer) => {
      const latestPayment = latestPaymentsMap.get(customer._id.toString());
      return {
        customer: {
          _id: customer._id.toString(),
          name: customer.displayName,
          note: customer.note,
          archivedAt: serializeArchivedAt(customer.archivedAt),
        },
        latestPayment: latestPayment
          ? {
            _id: latestPayment._id.toString(),
            paidDate: latestPayment.paidDate,
            endDate: latestPayment.endDate,
            currency: latestPayment.currency,
            amount: latestPayment.amount,
            months: latestPayment.months,
            note: latestPayment.note,
          }
          : null,
        status: computeStatus(latestPayment?.endDate || null),
      };
    });

  return json({ customers: archivedCustomers });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const customerId = String(formData.get("customerId") || "");

  if (intent !== "unarchive" && intent !== "unarchiveWithPayment") {
    return json<ActionData>({ error: "Thao tác không hợp lệ" }, { status: 400 });
  }

  if (!customerId || !ObjectId.isValid(customerId)) {
    return json<ActionData>({ error: "ID thành viên không hợp lệ" }, { status: 400 });
  }

  if (intent === "unarchive") {
    try {
      await unarchiveCustomer(customerId);
      return redirect("/826264/customers/archived");
    } catch (error) {
      console.error("Error restoring archived customer:", error);
      return json<ActionData>(
        { error: "Khôi phục thành viên thất bại. Vui lòng kiểm tra tên trùng và thử lại." },
        { status: 500 }
      );
    }
  }

  const currencyRaw = String(formData.get("currency") || "VND");
  const currency: Currency = currencyRaw === "USD" ? "USD" : "VND";
  const amountStr = String(formData.get("amount") || "").trim();
  const monthsStr = String(formData.get("months") || "").trim();
  const paidDate = String(formData.get("paidDate") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const errors: ActionData["errors"] = {};

  const customer = await getCustomerById(customerId);
  if (!customer) {
    errors.customerId = "Không tìm thấy thành viên";
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

  const values = {
    customerId,
    currency,
    amount: amountStr,
    months: monthsStr,
    paidDate,
    note,
  };

  if (Object.keys(errors).length > 0) {
    return json<ActionData>(
      { errors, values, recommendedMonths },
      { status: 400 }
    );
  }

  try {
    await unarchiveCustomer(customerId, note || undefined);
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
    console.error("Error restoring archived customer with payment:", error);
    return json<ActionData>(
      {
        errors: {
          form: "Khôi phục và tạo thanh toán thất bại. Vui lòng thử lại.",
        },
        values,
        recommendedMonths,
      },
      { status: 500 }
    );
  }
}

function formatArchivedAt(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("vi-VN");
}

type RestoreTarget = {
  id: string;
  name: string;
};

function getRestoreTargetById(
  customers: Array<{ customer: { _id: string; name: string } }>,
  customerId: string | undefined
): RestoreTarget | null {
  if (!customerId) {
    return null;
  }

  const match = customers.find((item) => item.customer._id === customerId);
  return match ? { id: match.customer._id, name: match.customer.name } : null;
}

function isCurrency(value: string | undefined): value is Currency {
  return value === "VND" || value === "USD";
}

function getInitialAmount(currency: Currency, rawAmount?: string): number {
  const parsed = rawAmount ? parseFloat(rawAmount) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return currency === "USD" ? BASE_PRICE_USD : BASE_PRICE_VND;
}

function RestoreActions({
  customer,
  onRestoreWithPayment,
}: {
  customer: RestoreTarget;
  onRestoreWithPayment: (target: RestoreTarget) => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      className="w-full sm:w-auto"
      onClick={() => onRestoreWithPayment(customer)}
    >
      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
      Khôi phục
    </Button>
  );
}

function RestoreWithPaymentDialog({
  target,
  actionData,
  onOpenChange,
}: {
  target: RestoreTarget | null;
  actionData: ActionData | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const navigation = useNavigation();
  const actionValues = actionData?.values;
  const targetValues = target && actionValues?.customerId === target.id
    ? actionValues
    : undefined;
  const fieldErrors = targetValues ? actionData?.errors : undefined;
  const initialCurrency = isCurrency(targetValues?.currency) ? targetValues.currency : "VND";
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [amount, setAmount] = useState(() => getInitialAmount(initialCurrency, targetValues?.amount));
  const [monthsManuallyEdited, setMonthsManuallyEdited] = useState(false);
  const recommendedMonths = calculateRecommendedMonths(amount, currency);
  const [months, setMonths] = useState(
    parseInt(targetValues?.months || String(recommendedMonths), 10) || 1
  );
  const isSubmitting =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "unarchiveWithPayment";

  useEffect(() => {
    if (!target) {
      return;
    }

    const nextCurrency = isCurrency(targetValues?.currency) ? targetValues.currency : "VND";
    const nextAmount = getInitialAmount(nextCurrency, targetValues?.amount);
    const nextRecommendedMonths = calculateRecommendedMonths(nextAmount, nextCurrency);

    setCurrency(nextCurrency);
    setAmount(nextAmount);
    setMonths(parseInt(targetValues?.months || String(nextRecommendedMonths), 10) || 1);
    setMonthsManuallyEdited(false);
  }, [target, targetValues?.amount, targetValues?.currency, targetValues?.months]);

  const handleAmountPreset = (preset: number) => {
    setAmount(preset);
    if (!monthsManuallyEdited) {
      setMonths(calculateRecommendedMonths(preset, currency));
    }
  };

  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Khôi phục thành viên</AlertDialogTitle>
          <AlertDialogDescription>
            Tạo thanh toán mới khi khôi phục &quot;{target?.name}&quot;.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="unarchiveWithPayment" />
          <input type="hidden" name="customerId" value={target?.id || ""} />

          {fieldErrors?.form && <FormErrorBanner message={fieldErrors.form} />}
          <FormMessage error={fieldErrors?.customerId} />

          <div className="space-y-2">
            <Label htmlFor="restoreCurrency">
              Tiền tệ <span className="text-red-500">*</span>
            </Label>
            <CurrencySelect
              name="currency"
              id="restoreCurrency"
              value={currency}
              onChange={setCurrency}
            />
            <FormMessage hint={`Giá cơ bản: ${BASE_PRICE_VND.toLocaleString("vi-VN")} ₫/tháng hoặc $${BASE_PRICE_USD}/tháng`} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="restoreAmount">
              Số tiền <span className="text-red-500">*</span>
            </Label>
            {currency === "VND" && (
              <AmountPresetChips currentAmount={amount} onSelect={handleAmountPreset} />
            )}
            <CurrencyAmountInput
              currency={currency}
              name="amount"
              id="restoreAmount"
              value={amount || ""}
              onChange={(event) => {
                const nextAmount = parseFloat(event.target.value) || 0;
                setAmount(nextAmount);
                if (!monthsManuallyEdited) {
                  setMonths(calculateRecommendedMonths(nextAmount, currency));
                }
              }}
              error={!!fieldErrors?.amount}
            />
            <FormMessage error={fieldErrors?.amount} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="restoreMonths">
              Số tháng <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              name="months"
              id="restoreMonths"
              min="1"
              step="1"
              value={months}
              onChange={(event) => {
                const nextMonths = parseInt(event.target.value, 10) || 1;
                setMonths(nextMonths);
                setMonthsManuallyEdited(true);
              }}
              className={fieldErrors?.months ? "border-red-300 focus-visible:ring-red-500" : ""}
              required
            />
            <MonthsRecommendation months={recommendedMonths} />
            <FormMessage error={fieldErrors?.months} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="restorePaidDate">
              Ngày thanh toán <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              name="paidDate"
              id="restorePaidDate"
              defaultValue={targetValues?.paidDate || getTodayDateOnly()}
              className={fieldErrors?.paidDate ? "border-red-300 focus-visible:ring-red-500" : ""}
              required
            />
            <FormMessage
              error={fieldErrors?.paidDate}
              hint={fieldErrors?.paidDate ? undefined : "Ngày hết hạn = ngày thanh toán + số tháng (theo lịch)"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="restoreNote">Ghi chú</Label>
            <Textarea
              name="note"
              id="restoreNote"
              rows={3}
              defaultValue={targetValues?.note || ""}
              placeholder="Ghi chú (tùy chọn) về lần khôi phục..."
            />
          </div>

          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel type="button">Hủy</AlertDialogCancel>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Khôi phục và tạo thanh toán"}
            </Button>
          </AlertDialogFooter>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ArchivedCustomers() {
  const { customers } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [restoreTarget, setRestoreTarget] = useState<RestoreTarget | null>(() =>
    getRestoreTargetById(customers, actionData?.values?.customerId)
  );

  useEffect(() => {
    const nextTarget = getRestoreTargetById(customers, actionData?.values?.customerId);
    if (nextTarget && actionData?.errors) {
      setRestoreTarget(nextTarget);
    }
  }, [actionData?.errors, actionData?.values?.customerId, customers]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Bảng điều khiển", to: "/826264" },
        { label: "Thành viên lưu trữ" },
      ]} />

      <PageHeader
        title="Thành viên lưu trữ"
        description={`${customers.length} thành viên đang được lưu trữ`}
      >
        <Button variant="outline" asChild>
          <Link to="/826264">Về bảng điều khiển</Link>
        </Button>
      </PageHeader>

      {actionData?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionData.error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <EmptyState icon={Archive} message="Chưa có thành viên lưu trữ" />
          ) : (
            <>
              <div className="hidden md:block">
                <div className="overflow-hidden rounded-xl">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Tên</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Ngày lưu trữ</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Trạng thái</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Ngày hết hạn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Thanh toán gần nhất</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {customers.map(({ customer, latestPayment, status }) => (
                        <tr key={customer._id} className="transition-colors hover:bg-zinc-50/50">
                          <td className="px-4 py-3 text-sm">
                            <div>
                              <p className="font-medium text-zinc-900">{customer.name}</p>
                              {customer.note && (
                                <p className="mt-0.5 text-xs text-zinc-400">{customer.note}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-zinc-600">
                            {formatArchivedAt(customer.archivedAt)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {latestPayment ? (
                              <span className={cn("tabular-nums", status.status === "expired" && "font-medium text-red-600")}>
                                {latestPayment.endDate}
                              </span>
                            ) : (
                              <span className="text-zinc-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-zinc-700">
                            {latestPayment ? formatCurrency(latestPayment.amount, latestPayment.currency) : (
                              <span className="text-zinc-300">Chưa có thanh toán</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <RestoreActions
                              customer={{ id: customer._id, name: customer.name }}
                              onRestoreWithPayment={setRestoreTarget}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2 p-4 md:hidden">
                {customers.map(({ customer, latestPayment, status }) => (
                  <div key={customer._id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">{customer.name}</p>
                        {customer.note && (
                          <p className="mt-1 text-xs text-zinc-400">{customer.note}</p>
                        )}
                      </div>
                      <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                      <div>
                        <span className="text-zinc-400">Lưu trữ:</span>{" "}
                        <span className="font-medium text-zinc-700">{formatArchivedAt(customer.archivedAt)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Hết hạn:</span>{" "}
                        {latestPayment ? (
                          <span className={cn("font-medium", status.status === "expired" ? "text-red-600" : "text-zinc-700")}>
                            {latestPayment.endDate}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-zinc-400">Thanh toán:</span>{" "}
                        {latestPayment ? (
                          <span className="font-medium text-zinc-700">
                            {formatCurrency(latestPayment.amount, latestPayment.currency)}
                          </span>
                        ) : (
                          <span className="text-zinc-300">Chưa có thanh toán</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <RestoreActions
                        customer={{ id: customer._id, name: customer.name }}
                        onRestoreWithPayment={setRestoreTarget}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <RestoreWithPaymentDialog
        target={restoreTarget}
        actionData={actionData}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreTarget(null);
          }
        }}
      />
    </div>
  );
}
