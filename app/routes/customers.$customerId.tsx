/**
 * PUBLIC Customer Detail Route (Read-Only)
 * 
 * Public view of customer details.
 * Shows status and latest payment info only - no admin actions.
 */

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";
import { ObjectId } from "mongodb";
import { getCustomerById } from "~/models/customer.server";
import { getLatestPaymentForCustomer } from "~/models/payment.server";
import { computeStatus } from "~/models/subscriptionStatus";
import PublicLanguageSelect from "~/components/PublicLanguageSelect";
import { getPublicStrings, normalizePublicLang } from "~/i18n/public";

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
  if (!customer || customer.isPublicHidden) {
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

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const badgeClasses: Record<string, string> = {
    active: "bg-green-100 text-green-800 border border-green-600",
    due: "bg-yellow-100 text-yellow-800 border border-yellow-600",
    grace: "bg-orange-100 text-orange-800 border border-orange-600",
    expired: "bg-red-100 text-red-800 border border-red-600",
    none: "bg-gray-100 text-gray-800 border border-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClasses[status]}`}
    >
      {label}
    </span>
  );
}

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
    <div className="space-y-6">
      <div className="flex justify-end">
        <PublicLanguageSelect
          lang={lang}
          label={strings.languageLabel}
          optionVi={strings.languageOptions.vi}
          optionEn={strings.languageOptions.en}
        />
      </div>

      {/* Customer Header */}
      <div
        className={`bg-white shadow rounded-lg overflow-hidden ${
          status.status === "none"
            ? ""
            : status.status === "active"
            ? "border-l-4 border-l-green-500"
            : status.status === "due"
            ? "border-l-4 border-l-yellow-500"
            : status.status === "grace"
            ? "border-l-4 border-l-orange-500"
            : "border-l-4 border-l-red-500"
        }`}
      >
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.name}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={status.status} label={status.label} />
              </div>
            </div>
          </div>

          {/* Customer Note */}
          {customer.note && (
            <div className="mt-4 bg-gray-50 rounded-md p-4">
              <h3 className="text-sm font-medium text-gray-700">
                {strings.customerDetail.note}
              </h3>
              <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                {customer.note}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Latest Payment Info (Read-Only) */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {strings.customerDetail.subscriptionStatusHeading}
          </h2>
        </div>
        <div className="p-6">
          {latestPayment ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {strings.customerDetail.currentPeriodEnds}
                </dt>
                <dd
                  className={`mt-1 text-lg font-semibold ${
                    status.status === "expired"
                      ? "text-red-600"
                      : "text-gray-900"
                  }`}
                >
                  {latestPayment.endDate}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {strings.customerDetail.latestPayment}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrency(latestPayment.amount, latestPayment.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {strings.customerDetail.paidDate}
                </dt>
                <dd className="mt-1 text-gray-900">{latestPayment.paidDate}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {strings.customerDetail.months}
                </dt>
                <dd className="mt-1 text-gray-900">
                  {strings.customerTable.formatMonths(latestPayment.months)}
                </dd>
              </div>
              {latestPayment.note && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    {strings.customerDetail.note}
                  </dt>
                  <dd className="mt-1 text-gray-900">{latestPayment.note}</dd>
                </div>
              )}
            </dl>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {strings.customerDetail.noPaymentHistory}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
