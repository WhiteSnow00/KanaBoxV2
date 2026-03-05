import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";
import { useState, useRef, useEffect } from "react";
import { listCustomers } from "~/models/customer.server";
import {
  computeStatus,
  listLatestPaymentsForAllCustomers,
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
  const customers = await listCustomers(searchQuery, { publicOnly: false });
  const today = getTodayDateOnly();
  const latestPaymentsMap = await listLatestPaymentsForAllCustomers();
  const customersWithStatus = customers.map((customer) => {
    const latestPayment = latestPaymentsMap.get(customer._id.toString());
    const computedStatus = computeStatus(latestPayment?.endDate || null);
    const status = {
      ...computedStatus,
      label: strings.statusLabels[computedStatus.status],
    };
    const isHidden =
      customer.isPublicHidden ||
      (customer.renewalCancelled &&
        latestPayment?.endDate &&
        today > latestPayment.endDate);
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
  });
  const publicCustomers = customersWithStatus.filter((c) => !c.isHidden);

  const statusCounts = { active: 0, due: 0, grace: 0, expired: 0 };
  for (const c of publicCustomers) {
    const s = c.status.status;
    if (s in statusCounts) {
      statusCounts[s as keyof typeof statusCounts]++;
    }
  }

  return json({
    customers: publicCustomers,
    searchQuery,
    lang,
    statusCounts,
    totalCount: publicCustomers.length,
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

function StatusCard({
  title,
  count,
  bgClass,
  borderClass,
  textClass,
  onClick,
  isSelected,
}: {
  title: string;
  count: number;
  bgClass: string;
  borderClass: string;
  textClass: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 ${borderClass} ${bgClass} p-4 sm:p-6 text-left w-full transition-all cursor-pointer ${isSelected ? "ring-2 ring-offset-2 ring-blue-500 scale-[1.02]" : "hover:opacity-80"
        }`}
    >
      <p className={`text-xs sm:text-sm font-medium ${textClass}`}>{title}</p>
      <p className={`mt-1 text-2xl sm:text-3xl font-semibold ${textClass}`}>
        {count.toLocaleString()}
      </p>
    </button>
  );
}

export default function PublicHome() {
  const { customers, lang, statusCounts, totalCount } = useLoaderData<typeof loader>();
  const strings = getPublicStrings(lang);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredCustomers = customers.filter((item) => {
    const matchesSearch = item.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === null || item.status.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {strings.membersHeading}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {strings.membersCount(filteredCustomers.length)}
          </p>
        </div>
        <PublicLanguageSelect
          lang={lang}
          label={strings.languageLabel}
          optionVi={strings.languageOptions.vi}
          optionEn={strings.languageOptions.en}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatusCard
          title={strings.membersHeading}
          count={totalCount}
          bgClass="bg-gray-100"
          borderClass="border-gray-400"
          textClass="text-gray-900"
          onClick={() => setStatusFilter(null)}
          isSelected={statusFilter === null}
        />
        <StatusCard
          title={strings.statusLabels.active}
          count={statusCounts.active}
          bgClass="bg-green-100"
          borderClass="border-green-600"
          textClass="text-green-900"
          onClick={() => setStatusFilter(statusFilter === "active" ? null : "active")}
          isSelected={statusFilter === "active"}
        />
        <StatusCard
          title={strings.statusLabels.due}
          count={statusCounts.due}
          bgClass="bg-yellow-100"
          borderClass="border-yellow-600"
          textClass="text-yellow-900"
          onClick={() => setStatusFilter(statusFilter === "due" ? null : "due")}
          isSelected={statusFilter === "due"}
        />
        <StatusCard
          title={strings.statusLabels.grace}
          count={statusCounts.grace}
          bgClass="bg-orange-100"
          borderClass="border-orange-600"
          textClass="text-orange-900"
          onClick={() => setStatusFilter(statusFilter === "grace" ? null : "grace")}
          isSelected={statusFilter === "grace"}
        />
        <StatusCard
          title={strings.statusLabels.expired}
          count={statusCounts.expired}
          bgClass="bg-red-100"
          borderClass="border-red-600"
          textClass="text-red-900"
          onClick={() => setStatusFilter(statusFilter === "expired" ? null : "expired")}
          isSelected={statusFilter === "expired"}
        />
      </div>
      <div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={lang === "en" ? "Search... (Ctrl+K)" : "Tìm kiếm... (Ctrl+K)"}
          className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm mb-4"
        />
      </div>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
          <CustomerTable
            customers={filteredCustomers}
            basePath="/customers"
            showAdminActions={false}
            readOnly={true}
            i18n={strings.customerTable}
          />
        </div>
      </div>
    </div>
  );
}