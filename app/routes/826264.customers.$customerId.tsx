import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData, useOutlet, Link, redirect, Form } from "@remix-run/react";
import { useState } from "react";
import { ObjectId } from "mongodb";
import {
  ArrowLeft, Pencil, CreditCard, Archive, Eye, EyeOff,
  CalendarDays, Clock, RefreshCw, XCircle, StickyNote, Ban,
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { cn } from "~/lib/utils";


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

const statusVariant: Record<string, "active" | "due" | "grace" | "expired" | "none"> = {
  active: "active",
  due: "due",
  grace: "grace",
  expired: "expired",
  none: "none",
};

const statusAccent: Record<string, string> = {
  active: "border-l-emerald-400",
  due: "border-l-amber-400",
  grace: "border-l-orange-400",
  expired: "border-l-red-400",
  none: "border-l-zinc-300",
};

function formatCurrency(amount: number, currency: string): string {
  if (currency === "VND") {
    return `${amount.toLocaleString("vi-VN")} ₫`;
  }
  return `$${amount.toFixed(2)}`;
}

export default function AdminCustomerDetail() {
  const outlet = useOutlet();
  const { customer, payments, latestStatus } = useLoaderData<typeof loader>();
  const [voidTarget, setVoidTarget] = useState<{ id: string; amount: string } | null>(null);

  if (outlet) {
    return outlet;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/826264" className="text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Bảng điều khiển
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-900 font-medium">{customer.name}</span>
      </div>

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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
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
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <Form method="post" className="contents">
                      <input type="hidden" name="intent" value="deleteCustomer" />
                      <AlertDialogAction type="submit" className="bg-red-600 hover:bg-red-700">
                        Lưu trữ
                      </AlertDialogAction>
                    </Form>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        {customer.note && (
          <CardContent className="pt-0">
            <div className="rounded-lg bg-zinc-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <StickyNote className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-500">Ghi chú</span>
              </div>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{customer.note}</p>
            </div>
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
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 mb-3">
                <CreditCard className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500">Chưa có lịch sử thanh toán</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to={`/826264/payments/new?customerId=${customer._id}`}>Thêm thanh toán đầu tiên</Link>
              </Button>
            </div>
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
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                  <Link to={`/826264/payments/${payment._id}/edit`}>Sửa</Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setVoidTarget({
                                    id: payment._id,
                                    amount: formatCurrency(payment.amount, payment.currency),
                                  })}
                                >
                                  <Ban className="h-3 w-3 mr-1" />
                                  Hủy bỏ
                                </Button>
                              </div>
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
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <Link to={`/826264/payments/${payment._id}/edit`}>Sửa</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setVoidTarget({
                            id: payment._id,
                            amount: formatCurrency(payment.amount, payment.currency),
                          })}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Hủy bỏ
                        </Button>
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
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Form method="post" className="contents" onSubmit={() => setVoidTarget(null)}>
              <input type="hidden" name="intent" value="deletePayment" />
              <input type="hidden" name="paymentId" value={voidTarget?.id || ""} />
              <AlertDialogAction type="submit" className="bg-red-600 hover:bg-red-700">
                Hủy bỏ thanh toán
              </AlertDialogAction>
            </Form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
