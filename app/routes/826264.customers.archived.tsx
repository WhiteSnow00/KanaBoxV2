import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
  useRevalidator,
} from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { ObjectId } from "mongodb";
import { Archive, Pencil, RefreshCw, Trash2 } from "lucide-react";
import {
  archiveCustomer,
  deleteArchivedCustomerWithPayments,
  getCustomerById,
  listCustomers,
  unarchiveCustomer,
} from "~/models/customer.server";
import {
  createPayment,
  listLatestPaymentsForAllCustomers,
  listPaymentCountsForAllCustomers,
} from "~/models/payment.server";
import {
  BASE_PRICE_USD,
  BASE_PRICE_VND,
  calculateRecommendedMonths,
  computeStatus,
  type Currency,
} from "~/models/subscriptionStatus";
import { getTodayDateOnly, isValidDateOnly } from "~/utils/date";
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
  PaginationControls,
  formatCurrency,
  getPageCount,
  paginateItems,
  statusVariant,
} from "~/components/shared";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () => [
  { title: "Thành viên lưu trữ - Quản trị - Kana Box V2" },
];

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

type DeleteFetcherData = {
  ok?: boolean;
  error?: string;
  customerId?: string;
  deletedPaymentCount?: number;
};

export async function loader({}: LoaderFunctionArgs) {
  const [customers, latestPaymentsMap, paymentCountsMap] = await Promise.all([
    listCustomers(undefined, { includeArchived: true }),
    listLatestPaymentsForAllCustomers(),
    listPaymentCountsForAllCustomers(),
  ]);

  const archivedCustomers = customers
    .filter((customer) => customer.isArchived)
    .map((customer) => {
      const customerId = customer._id.toString();
      const latestPayment = latestPaymentsMap.get(customerId);
      return {
        customer: {
          _id: customerId,
          name: customer.displayName,
          note: customer.note,
          archivedAt: serializeArchivedAt(customer.archivedAt),
        },
        paymentCount: paymentCountsMap.get(customerId) || 0,
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

  if (
    intent !== "unarchive" &&
    intent !== "unarchiveWithPayment" &&
    intent !== "deleteArchived"
  ) {
    return json<ActionData>({ error: "Thao tác không hợp lệ" }, { status: 400 });
  }

  if (!customerId || !ObjectId.isValid(customerId)) {
    return json<ActionData>({ error: "ID thành viên không hợp lệ" }, { status: 400 });
  }

  if (intent === "deleteArchived") {
    const customer = await getCustomerById(customerId);
    if (!customer) {
      return json<DeleteFetcherData>(
        { ok: false, error: "Không tìm thấy thành viên", customerId },
        { status: 404 }
      );
    }

    if (!customer.isArchived) {
      return json<DeleteFetcherData>(
        {
          ok: false,
          error: "Chỉ có thể xóa vĩnh viễn thành viên đang lưu trữ",
          customerId,
        },
        { status: 400 }
      );
    }

    try {
      const deleted = await deleteArchivedCustomerWithPayments(customerId);
      if (!deleted) {
        return json<DeleteFetcherData>(
          { ok: false, error: "Không tìm thấy thành viên lưu trữ", customerId },
          { status: 404 }
        );
      }

      return json<DeleteFetcherData>({
        ok: true,
        customerId,
        deletedPaymentCount: deleted.deletedPaymentCount,
      });
    } catch (error) {
      console.error("Error permanently deleting archived customer:", error);
      return json<DeleteFetcherData>(
        {
          ok: false,
          error: "Xóa thành viên lưu trữ thất bại. Vui lòng thử lại.",
          customerId,
        },
        { status: 500 }
      );
    }
  }

  if (intent === "unarchive") {
    const customer = await getCustomerById(customerId);
    if (!customer || !customer.isArchived) {
      return json<ActionData>(
        { error: "Thành viên không ở trạng thái lưu trữ" },
        { status: 400 }
      );
    }

    try {
      const restored = await unarchiveCustomer(customerId);
      if (!restored) {
        return json<ActionData>(
          { error: "Không tìm thấy thành viên" },
          { status: 404 }
        );
      }
      return redirect("/826264/customers/archived");
    } catch (error) {
      console.error("Error restoring archived customer:", error);
      const conflict =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: number }).code === 11000
          : false;
      return json<ActionData>(
        {
          error: conflict
            ? "Đã có thành viên đang hoạt động với tên này. Vui lòng đổi tên trước khi khôi phục."
            : "Khôi phục thành viên thất bại. Vui lòng thử lại.",
        },
        { status: conflict ? 409 : 500 }
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
  } else if (!customer.isArchived) {
    errors.customerId = "Thành viên không ở trạng thái lưu trữ";
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

  let restored = false;
  try {
    const restoredCustomer = await unarchiveCustomer(customerId);
    if (!restoredCustomer) {
      return json<ActionData>(
        {
          errors: { customerId: "Không tìm thấy thành viên" },
          values,
          recommendedMonths,
        },
        { status: 404 }
      );
    }
    restored = true;

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

    if (restored) {
      try {
        await archiveCustomer(customerId);
      } catch (rollbackError) {
        console.error("Error rolling back unarchive:", rollbackError);
      }
    }

    const conflict =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: number }).code === 11000
        : false;

    return json<ActionData>(
      {
        errors: {
          form: conflict
            ? "Đã có thành viên đang hoạt động với tên này. Vui lòng đổi tên trước khi khôi phục."
            : "Khôi phục và tạo thanh toán thất bại. Vui lòng thử lại.",
        },
        values,
        recommendedMonths,
      },
      { status: conflict ? 409 : 500 }
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

type DeleteTarget = RestoreTarget & {
  paymentCount: number;
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

function formatPaymentCount(count: number): string {
  return `${count} bản ghi thanh toán`;
}

function ArchivedCustomerActions({
  customer,
  paymentCount,
  onRestoreWithPayment,
  onDelete,
}: {
  customer: RestoreTarget;
  paymentCount: number;
  onRestoreWithPayment: (target: RestoreTarget) => void;
  onDelete: (target: DeleteTarget) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" asChild>
        <Link to={`/826264/customers/${customer.id}/edit?from=archived`}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Sửa
        </Link>
      </Button>
      <Button
        type="button"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => onRestoreWithPayment(customer)}
      >
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        Khôi phục
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => onDelete({ ...customer, paymentCount })}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Xóa
      </Button>
    </div>
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
            <Label htmlFor="restoreNote">Ghi chú thanh toán</Label>
            <Textarea
              name="note"
              id="restoreNote"
              rows={3}
              defaultValue={targetValues?.note || ""}
              placeholder="Ghi chú (tùy chọn) cho thanh toán này..."
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

function DeleteArchivedCustomerDialog({
  target,
  error,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: {
  target: DeleteTarget | null;
  error: string | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa vĩnh viễn thành viên</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn xóa vĩnh viễn &quot;{target?.name}&quot;? Thành viên này và {formatPaymentCount(target?.paymentCount || 0)} liên quan sẽ bị xóa khỏi cơ sở dữ liệu.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ArchivedCustomers() {
  const { customers } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const deleteFetcher = useFetcher<DeleteFetcherData>();
  const revalidator = useRevalidator();
  const [restoreTarget, setRestoreTarget] = useState<RestoreTarget | null>(() =>
    getRestoreTargetById(customers, actionData?.values?.customerId)
  );
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const visibleCustomers = useMemo(
    () => customers.filter((item) => !optimisticDeletedIds.has(item.customer._id)),
    [customers, optimisticDeletedIds]
  );

  useEffect(() => {
    setPage(1);
  }, [customers]);

  useEffect(() => {
    const pageCount = getPageCount(visibleCustomers.length);
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, visibleCustomers.length]);

  const paginatedCustomers = useMemo(
    () => paginateItems(visibleCustomers, page),
    [page, visibleCustomers]
  );

  useEffect(() => {
    const nextTarget = getRestoreTargetById(customers, actionData?.values?.customerId);
    if (nextTarget && actionData?.errors) {
      setRestoreTarget(nextTarget);
    }
  }, [actionData?.errors, actionData?.values?.customerId, customers]);

  useEffect(() => {
    if (deleteFetcher.state !== "idle" || !pendingDeleteId) {
      return;
    }

    if (deleteFetcher.data?.error) {
      setOptimisticDeletedIds((current) => {
        const next = new Set(current);
        next.delete(pendingDeleteId);
        return next;
      });
      setDeleteError(deleteFetcher.data.error);
    } else if (deleteFetcher.data?.ok) {
      setDeleteTarget(null);
      revalidator.revalidate();
    }

    setPendingDeleteId(null);
  }, [deleteFetcher.data, deleteFetcher.state, pendingDeleteId, revalidator]);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteError(null);
    setPendingDeleteId(deleteTarget.id);
    setOptimisticDeletedIds((current) => new Set(current).add(deleteTarget.id));
    deleteFetcher.submit(
      { intent: "deleteArchived", customerId: deleteTarget.id },
      { method: "post" }
    );
  };

  return (
    <div className="page-stack">
      <Breadcrumb items={[
        { label: "Bảng điều khiển", to: "/826264" },
        { label: "Thành viên lưu trữ" },
      ]} />

      <PageHeader
        title="Thành viên lưu trữ"
        description={`${visibleCustomers.length} thành viên đang được lưu trữ`}
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

      {deleteError && !deleteTarget && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {visibleCustomers.length === 0 ? (
            <EmptyState icon={Archive} message="Chưa có thành viên lưu trữ" />
          ) : (
            <>
              <div className="hidden md:block">
                <div className="table-shell border-0 shadow-none">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tên</th>
                        <th>Ngày lưu trữ</th>
                        <th>Trạng thái</th>
                        <th>Ngày hết hạn</th>
                        <th>Thanh toán gần nhất</th>
                        <th className="text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCustomers.map(({ customer, latestPayment, paymentCount, status }) => (
                        <tr key={customer._id}>
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
                            <div>
                              {latestPayment ? formatCurrency(latestPayment.amount, latestPayment.currency) : (
                                <span className="text-zinc-300">Chưa có thanh toán</span>
                              )}
                              <p className="mt-0.5 text-xs text-zinc-400">{formatPaymentCount(paymentCount)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <ArchivedCustomerActions
                              customer={{ id: customer._id, name: customer.name }}
                              paymentCount={paymentCount}
                              onRestoreWithPayment={setRestoreTarget}
                              onDelete={setDeleteTarget}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="reveal-list space-y-2 p-4 md:hidden">
                {paginatedCustomers.map(({ customer, latestPayment, paymentCount, status }) => (
                  <div key={customer._id} className="mobile-record">
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
                        <span className="ml-1 text-zinc-400">({formatPaymentCount(paymentCount)})</span>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <ArchivedCustomerActions
                        customer={{ id: customer._id, name: customer.name }}
                        paymentCount={paymentCount}
                        onRestoreWithPayment={setRestoreTarget}
                        onDelete={setDeleteTarget}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PaginationControls
        page={page}
        totalItems={visibleCustomers.length}
        itemLabel="thành viên"
        onPageChange={setPage}
      />

      <RestoreWithPaymentDialog
        target={restoreTarget}
        actionData={actionData}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreTarget(null);
          }
        }}
      />
      <DeleteArchivedCustomerDialog
        target={deleteTarget}
        error={deleteError}
        isSubmitting={deleteFetcher.state !== "idle" && pendingDeleteId === deleteTarget?.id}
        onOpenChange={(open) => {
          if (!open && deleteFetcher.state === "idle") {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
