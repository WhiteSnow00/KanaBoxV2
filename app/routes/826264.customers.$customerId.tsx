import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useFetcher, useLoaderData, useOutlet, Link, redirect, Form } from "@remix-run/react";
import { useState } from "react";
import { ObjectId } from "mongodb";
import {
  Pencil, CreditCard, Archive, Eye, EyeOff,
  RefreshCw, XCircle, StickyNote, Ban,
} from "lucide-react";
import {
  getCustomerById,
  hideCustomerFromPublic,
  unhideCustomer,
  archiveCustomer,
  cancelRenewal,
  resumeRenewal,
} from "~/models/customer.server";
import { listPaymentsForCustomer, voidPayment } from "~/models/payment.server";
import { computeStatus } from "~/models/subscriptionStatus";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { cn } from "~/lib/utils";
import {
  Breadcrumb,
  EmptyState,
  NoteBlock,
  formatCurrency,
  statusAccent,
} from "~/components/shared";

const statusVariant: Record<string, "active" | "due" | "grace" | "expired" | "none"> = {
  active: "active",
  due: "due",
  grace: "grace",
  expired: "expired",
  none: "none",
};

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.customer.name || "Thành viên"} - Quản trị - Kana Box V2` },
];

export async function loader({ params }: LoaderFunctionArgs) {
  const { customerId } = params;

  if (!customerId || !ObjectId.isValid(customerId)) {
    throw new Response("ID thành viên không hợp lệ", { status: 400 });
  }

  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new Response("Không tìm thấy thành viên", { status: 404 });
  }

  const payments = await listPaymentsForCustomer(customerId);
  const latestPayment = payments[0] || null;
  const status = computeStatus(latestPayment?.endDate || null);

  return json({
    customer: {
      _id: customer._id.toString(),
      name: customer.displayName,
      nameHistory: customer.nameHistory || [],
      note: customer.note,
      isPublicHidden: customer.isPublicHidden || false,
      renewalCancelled: customer.renewalCancelled || false,
      cancelledAt: customer.cancelledAt || null,
    },
    payments: payments.map((p) => ({
      _id: p._id.toString(),
      customerId: p.customerId.toString(),
      paidDate: p.paidDate,
      endDate: p.endDate,
      currency: p.currency,
      amount: p.amount,
      months: p.months,
      note: p.note,
    })),
    latestStatus: status,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { customerId } = params;

  if (!customerId || !ObjectId.isValid(customerId)) {
    return json({ error: "Invalid customer ID" }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "hide") {
    await hideCustomerFromPublic(customerId);
    return redirect(`/826264/customers/${customerId}`);
  } else if (intent === "unhide") {
    await unhideCustomer(customerId);
    return redirect(`/826264/customers/${customerId}`);
  } else if (intent === "cancelRenewal") {
    await cancelRenewal(customerId);
    return redirect(`/826264/customers/${customerId}`);
  } else if (intent === "resumeRenewal") {
    await resumeRenewal(customerId);
    return redirect(`/826264/customers/${customerId}`);
  } else if (intent === "deleteCustomer") {
    await archiveCustomer(customerId);
    return redirect("/826264");
  } else if (intent === "deletePayment") {
    const paymentId = String(formData.get("paymentId") || "");
    if (paymentId && ObjectId.isValid(paymentId)) {
      await voidPayment(paymentId);
    }
    return redirect(`/826264/customers/${customerId}`);
  }

  return redirect(`/826264/customers/${customerId}`);
}

function PaymentActions({
  paymentId,
  editUrl,
  onVoid,
}: {
  paymentId: string;
  editUrl: string;
  onVoid: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
        <Link to={editUrl}>Sửa</Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={onVoid}
      >
        <Ban className="h-3 w-3 mr-1" />
        Hủy bỏ
      </Button>
    </div>
  );
}

export default function AdminCustomerDetail() {
  const outlet = useOutlet();
  const { customer, payments, latestStatus } = useLoaderData<typeof loader>();
  const [voidTarget, setVoidTarget] = useState<{ id: string; amount: string } | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const archiveFetcher = useFetcher<{ error?: string }>();
  const voidFetcher = useFetcher<{ error?: string }>();

  if (outlet) {
    return outlet;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Bảng điều khiển", to: "/826264" },
        { label: customer.name },
      ]} />

      <Card className={cn("border-l-[3px]", statusAccent[latestStatus.status] || "border-l-zinc-300")}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-xl">{customer.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant[latestStatus.status] || "none"}>{latestStatus.label}</Badge>
                {customer.isPublicHidden && <Badge variant="hidden">Ẩn khỏi công khai</Badge>}
                {customer.renewalCancelled && <Badge variant="cancelled">Đã hủy gia hạn</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Form method="post" className="contents">
                <input type="hidden" name="intent" value={customer.isPublicHidden ? "unhide" : "hide"} />
                <Button type="submit" variant="outline" size="sm">
                  {customer.isPublicHidden ? (
                    <><Eye className="h-3.5 w-3.5 mr-1.5" />Hiện công khai</>
                  ) : (
                    <><EyeOff className="h-3.5 w-3.5 mr-1.5" />Ẩn công khai</>
                  )}
                </Button>
              </Form>
              <Form method="post" className="contents">
                <input type="hidden" name="intent" value={customer.renewalCancelled ? "resumeRenewal" : "cancelRenewal"} />
                <Button type="submit" variant="outline" size="sm">
                  {customer.renewalCancelled ? (
                    <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Tiếp tục gia hạn</>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5 mr-1.5" />Hủy gia hạn</>
                  )}
                </Button>
              </Form>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/826264/customers/${customer._id}/edit`}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Sửa
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/826264/payments/new?customerId=${customer._id}`}>
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                  Thêm thanh toán
                </Link>
              </Button>
              <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setArchiveDialogOpen(true)}
                  >
                    <Archive className="h-3.5 w-3.5 mr-1.5" />
                    Lưu trữ
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Lưu trữ thành viên</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc muốn lưu trữ &quot;{customer.name}&quot;? Họ sẽ bị ẩn khỏi bảng nhưng dữ liệu thanh toán vẫn được giữ lại.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setArchiveDialogOpen(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                      disabled={archiveFetcher.state !== "idle"}
                      onClick={() => {
                        setArchiveDialogOpen(false);
                        archiveFetcher.submit(
                          { intent: "deleteCustomer" },
                          { method: "post" }
                        );
                      }}
                    >
                      {archiveFetcher.state !== "idle" ? "Đang lưu trữ..." : "Lưu trữ"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        {(customer.note || customer.nameHistory.length > 0) && (
          <CardContent className="space-y-3 pt-0">
            {customer.note && (
              <NoteBlock icon={StickyNote} label="Ghi chú" text={customer.note} />
            )}
            {customer.nameHistory.length > 0 && (
              <div className="rounded-lg bg-zinc-50 p-3">
                <p className="mb-2 text-xs font-medium text-zinc-500">Lịch sử đổi tên</p>
                <div className="space-y-1">
                  {customer.nameHistory.map((entry, index) => (
                    <p key={`${entry.name}-${entry.changedAt}-${index}`} className="text-xs text-zinc-600">
                      {entry.name} · {new Date(entry.changedAt).toLocaleDateString("vi-VN")}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lịch sử thanh toán</CardTitle>
            <span className="text-sm text-zinc-400">{payments.length} bản ghi</span>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} message="Chưa có lịch sử thanh toán">
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to={`/826264/payments/new?customerId=${customer._id}`}>Thêm thanh toán đầu tiên</Link>
              </Button>
            </EmptyState>
          ) : (
            <>
              <div className="hidden md:block">
                <div className="rounded-xl border border-zinc-200 overflow-hidden">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Ngày thanh toán</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Ngày hết hạn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Số tiền</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Số tháng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {payments.map((payment, index) => {
                        const paymentStatus = computeStatus(payment.endDate);
                        const isLatest = index === 0;

                        return (
                          <tr key={payment._id} className={cn("transition-colors hover:bg-zinc-50/50", isLatest && "bg-indigo-50/30")}>
                            <td className="px-4 py-3 text-sm text-zinc-900 tabular-nums">{payment.paidDate}</td>
                            <td className="px-4 py-3 text-sm text-zinc-900 tabular-nums">{payment.endDate}</td>
                            <td className="px-4 py-3 text-sm font-medium text-zinc-900 tabular-nums">
                              {formatCurrency(payment.amount, payment.currency)}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-500 tabular-nums">{payment.months}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant={statusVariant[paymentStatus.status] || "none"}>{paymentStatus.label}</Badge>
                                {isLatest && <Badge variant="info">hiện tại</Badge>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <PaymentActions
                                paymentId={payment._id}
                                editUrl={`/826264/payments/${payment._id}/edit`}
                                onVoid={() => setVoidTarget({
                                  id: payment._id,
                                  amount: formatCurrency(payment.amount, payment.currency),
                                })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:hidden space-y-2">
                {payments.map((payment, index) => {
                  const paymentStatus = computeStatus(payment.endDate);
                  const isLatest = index === 0;
                  return (
                    <div key={payment._id} className={cn("rounded-xl border p-4", isLatest ? "border-indigo-200 bg-indigo-50/20" : "border-zinc-200")}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant[paymentStatus.status] || "none"}>{paymentStatus.label}</Badge>
                          {isLatest && <Badge variant="info">hiện tại</Badge>}
                        </div>
                        <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                          {formatCurrency(payment.amount, payment.currency)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 text-xs text-zinc-500 mb-3">
                        <div>Thanh toán: <span className="text-zinc-700 font-medium tabular-nums">{payment.paidDate}</span></div>
                        <div>Hết hạn: <span className="text-zinc-700 font-medium tabular-nums">{payment.endDate}</span></div>
                        <div>Số tháng: <span className="text-zinc-700 font-medium">{payment.months}</span></div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                        <PaymentActions
                          paymentId={payment._id}
                          editUrl={`/826264/payments/${payment._id}/edit`}
                          onVoid={() => setVoidTarget({
                            id: payment._id,
                            amount: formatCurrency(payment.amount, payment.currency),
                          })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!voidTarget} onOpenChange={(open) => { if (!open) setVoidTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy bỏ thanh toán</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy bỏ thanh toán {voidTarget?.amount}? Dữ liệu sẽ được giữ lại nhưng không còn tính vào báo cáo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVoidTarget(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={voidFetcher.state !== "idle"}
              onClick={() => {
                if (!voidTarget) return;
                const paymentId = voidTarget.id;
                setVoidTarget(null);
                voidFetcher.submit(
                  { intent: "deletePayment", paymentId },
                  { method: "post" }
                );
              }}
            >
              {voidFetcher.state !== "idle" ? "Đang hủy..." : "Hủy bỏ thanh toán"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
