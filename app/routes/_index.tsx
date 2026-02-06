/**
 * PUBLIC HOME - Members List (View-Only)
 * 
 * Public page showing customer list with statuses.
 * No admin actions - view only.
 */

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";
import { listCustomers } from "~/models/customer.server";
import {
  getLatestPaymentForCustomer,
  computeStatus,
} from "~/models/payment.server";
import { getTodayDateOnly } from "~/utils/date";
import CustomerTable from "~/components/CustomerTable";
import PublicLanguageSelect from "~/components/PublicLanguageSelect";
import { getPublicStrings, normalizePublicLang } from "~/i18n/public";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const lang = data?.lang === "en" ? "en" : "vi";
  const strings = getPublicStrings(lang);
  return [{ title: `${strings.membersHeading} - Kana Box V2` }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q") || "";
  const lang = normalizePublicLang(url.searchParams.get("lang"));
  const strings = getPublicStrings(lang);

  // Get all customers (including hidden ones, we'll filter manually for renewal cancelled)
  const customers = await listCustomers(searchQuery, { publicOnly: false });

  const today = getTodayDateOnly();

  const customersWithStatus = await Promise.all(
    customers.map(async (customer) => {
      const latestPayment = await getLatestPaymentForCustomer(
        customer._id.toString()
      );
      const computedStatus = computeStatus(latestPayment?.endDate || null);
      const status = {
        ...computedStatus,
        label: strings.statusLabels[computedStatus.status],
      };
      
      // Check if customer should be hidden from public
      const isHidden = customer.isPublicHidden || 
        (customer.renewalCancelled && latestPayment?.endDate && today > latestPayment.endDate);
      
      return {
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
        isHidden,
      };
    })
  );

  // Filter out hidden customers for public view
  const publicCustomers = customersWithStatus.filter((c) => !c.isHidden);

  return json({
    customers: publicCustomers,
    searchQuery,
    lang,
  });
}

export default function PublicHome() {
  const { customers, lang } = useLoaderData<typeof loader>();
  const strings = getPublicStrings(lang);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {strings.membersHeading}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {strings.membersCount(customers.length)}
          </p>
        </div>
        <PublicLanguageSelect
          lang={lang}
          label={strings.languageLabel}
          optionVi={strings.languageOptions.vi}
          optionEn={strings.languageOptions.en}
        />
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="font-medium text-gray-700">
          {strings.statusLegendLabel}
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 rounded-full bg-green-200 mr-1"></span>
          {strings.statusLabels.active}
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 rounded-full bg-yellow-200 mr-1"></span>
          {strings.statusLabels.due}
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 rounded-full bg-orange-200 mr-1"></span>
          {strings.statusLabels.grace}
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 rounded-full bg-red-200 mr-1"></span>
          {strings.statusLabels.expired}
        </span>
      </div>

      {/* Customer Table - Public view (read-only, no links) */}
      <CustomerTable
        customers={customers}
        basePath="/customers"
        showAdminActions={false}
        readOnly={true}
        i18n={strings.customerTable}
      />
    </div>
  );
}
