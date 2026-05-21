import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { ObjectId } from "mongodb";
import { Archive, RefreshCw } from "lucide-react";
import { listCustomers, unarchiveCustomer } from "~/models/customer.server";
import { computeStatus, listLatestPaymentsForAllCustomers } from "~/models/payment.server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Breadcrumb, EmptyState, PageHeader, formatCurrency } from "~/components/shared";
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
          archivedAt: customer.archivedAt?.toISOString() || null,
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

  if (intent !== "unarchive") {
    return json({ error: "Thao tác không hợp lệ" }, { status: 400 });
  }

  if (!customerId || !ObjectId.isValid(customerId)) {
    return json({ error: "ID thành viên không hợp lệ" }, { status: 400 });
  }

  try {
    await unarchiveCustomer(customerId);
    return redirect("/826264/customers/archived");
  } catch (error) {
    console.error("Error restoring archived customer:", error);
    return json(
      { error: "Khôi phục thành viên thất bại. Vui lòng kiểm tra tên trùng và thử lại." },
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

export default function ArchivedCustomers() {
  const { customers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

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
                            <Form method="post">
                              <input type="hidden" name="intent" value="unarchive" />
                              <input type="hidden" name="customerId" value={customer._id} />
                              <Button type="submit" variant="outline" size="sm">
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                Khôi phục
                              </Button>
                            </Form>
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

                    <Form method="post" className="mt-3 border-t border-zinc-100 pt-3">
                      <input type="hidden" name="intent" value="unarchive" />
                      <input type="hidden" name="customerId" value={customer._id} />
                      <Button type="submit" variant="outline" size="sm" className="w-full">
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Khôi phục
                      </Button>
                    </Form>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
