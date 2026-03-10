import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";
import { ObjectId } from "mongodb";
import { getCustomerById } from "~/models/customer.server";
import { getLatestPaymentForCustomer } from "~/models/payment.server";
import { computeStatus } from "~/models/subscriptionStatus";
import PublicLanguageSelect from "~/components/PublicLanguageSelect";
import { getPublicStrings, normalizePublicLang } from "~/i18n/public";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { CalendarDays, CreditCard, Clock, StickyNote, FileX } from "lucide-react";
import { cn } from "~/lib/utils";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: `${data?.customer.name || getPublicStrings(data?.lang === "en" ? "en" : "vi").membersHeading} - Kana Box V2`,
  },
];

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { customerId } = params;
  const url = new URL(request.url);
  const lang = normalizePublicLang(url.searchParams.get("lang"));
  const strings = getPublicStrings(lang);

  if (!customerId || !ObjectId.isValid(customerId)) {
    throw new Response("ID thành viên không hợp lệ", { status: 400 });
  }

  const customer = await getCustomerById(customerId);
  if (!customer || customer.isPublicHidden || customer.isArchived) {
    throw new Response("Không tìm thấy thành viên", { status: 404 });
  }

  const latestPayment = await getLatestPaymentForCustomer(customerId);
  const computedStatus = computeStatus(latestPayment?.endDate || null);
  const status = {
    ...computedStatus,
    label: strings.statusLabels[computedStatus.status],
  };

  return json({
    customer: {
      _id: customer._id.toString(),
      name: customer.displayName,
      note: customer.note,
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
    status,
    lang,
  });
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

export default function PublicCustomerDetail() {
  const { customer, latestPayment, status, lang } = useLoaderData<typeof loader>();
  const strings = getPublicStrings(lang);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-end">
        <PublicLanguageSelect
          lang={lang}
          label={strings.languageLabel}
          optionVi={strings.languageOptions.vi}
          optionEn={strings.languageOptions.en}
        />
      </div>

      <Card className={cn("border-l-[3px] overflow-hidden", statusAccent[status.status] || "border-l-zinc-300")}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{customer.name}</CardTitle>
              <div className="mt-2">
                <Badge variant={statusVariant[status.status] || "none"}>{status.label}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        {customer.note && (
          <CardContent className="pb-4">
            <div className="rounded-lg bg-zinc-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <StickyNote className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-500">{strings.customerDetail.note}</span>
              </div>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{customer.note}</p>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{strings.customerDetail.subscriptionStatusHeading}</CardTitle>
        </CardHeader>
        <CardContent>
          {latestPayment ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                  <CalendarDays className="h-4 w-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400">{strings.customerDetail.currentPeriodEnds}</p>
                  <p className={cn(
                    "mt-0.5 text-base font-semibold tabular-nums",
                    status.status === "expired" ? "text-red-600" : "text-zinc-900"
                  )}>
                    {latestPayment.endDate}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                  <CreditCard className="h-4 w-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400">{strings.customerDetail.latestPayment}</p>
                  <p className="mt-0.5 text-base font-semibold text-zinc-900 tabular-nums">
                    {formatCurrency(latestPayment.amount, latestPayment.currency)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                  <CalendarDays className="h-4 w-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400">{strings.customerDetail.paidDate}</p>
                  <p className="mt-0.5 text-sm text-zinc-900 tabular-nums">{latestPayment.paidDate}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                  <Clock className="h-4 w-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400">{strings.customerDetail.months}</p>
                  <p className="mt-0.5 text-sm text-zinc-900">
                    {strings.customerTable.formatMonths(latestPayment.months)}
                  </p>
                </div>
              </div>
              {latestPayment.note && (
                <>
                  <Separator className="sm:col-span-2" />
                  <div className="sm:col-span-2 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                      <StickyNote className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-400">{strings.customerDetail.note}</p>
                      <p className="mt-0.5 text-sm text-zinc-700">{latestPayment.note}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 mb-3">
                <FileX className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500">{strings.customerDetail.noPaymentHistory}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
