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
import {
  formatCurrency,
  statusAccent,
  NoteBlock,
  EmptyState,
  InfoItem,
} from "~/components/shared";

const statusVariant: Record<string, "active" | "due" | "grace" | "expired" | "none"> = {
  active: "active",
  due: "due",
  grace: "grace",
  expired: "expired",
  none: "none",
};

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
            <NoteBlock icon={StickyNote} label={strings.customerDetail.note} text={customer.note} />
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
              <InfoItem icon={CalendarDays} label={strings.customerDetail.currentPeriodEnds}>
                <p className={cn(
                  "mt-0.5 text-base font-semibold tabular-nums",
                  status.status === "expired" ? "text-red-600" : "text-zinc-900"
                )}>
                  {latestPayment.endDate}
                </p>
              </InfoItem>
              <InfoItem icon={CreditCard} label={strings.customerDetail.latestPayment}>
                <p className="mt-0.5 text-base font-semibold text-zinc-900 tabular-nums">
                  {formatCurrency(latestPayment.amount, latestPayment.currency)}
                </p>
              </InfoItem>
              <InfoItem icon={CalendarDays} label={strings.customerDetail.paidDate}>
                <p className="mt-0.5 text-sm text-zinc-900 tabular-nums">{latestPayment.paidDate}</p>
              </InfoItem>
              <InfoItem icon={Clock} label={strings.customerDetail.months}>
                <p className="mt-0.5 text-sm text-zinc-900">
                  {strings.customerTable.formatMonths(latestPayment.months)}
                </p>
              </InfoItem>
              {latestPayment.note && (
                <>
                  <Separator className="sm:col-span-2" />
                  <div className="sm:col-span-2">
                    <InfoItem icon={StickyNote} label={strings.customerDetail.note}>
                      <p className="mt-0.5 text-sm text-zinc-700">{latestPayment.note}</p>
                    </InfoItem>
                  </div>
                </>
              )}
            </div>
          ) : (
            <EmptyState icon={FileX} message={strings.customerDetail.noPaymentHistory} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
