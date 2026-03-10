import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";
import { useState, useRef, useEffect } from "react";
import { Search, Users, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import { listCustomers } from "~/models/customer.server";
import {
  computeStatus,
  listLatestPaymentsForAllCustomers,
} from "~/models/payment.server";
import { getTodayDateOnly } from "~/utils/date";
import CustomerTable from "~/components/CustomerTable";
import PublicLanguageSelect from "~/components/PublicLanguageSelect";
import { getPublicStrings, normalizePublicLang } from "~/i18n/public";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";

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

const statusCardConfig = [
  { key: "active", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-400" },
  { key: "due", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-400" },
  { key: "grace", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", ring: "ring-orange-400" },
  { key: "expired", icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", ring: "ring-red-400" },
] as const;

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {strings.membersHeading}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setStatusFilter(null)}
          className={cn(
            "group rounded-xl border bg-white p-4 text-left transition-all",
            statusFilter === null
              ? "border-indigo-300 ring-2 ring-indigo-200 shadow-sm"
              : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-medium text-zinc-500">{strings.membersHeading}</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{totalCount}</p>
        </button>
        {statusCardConfig.map(({ key, icon: Icon, color, bg, border, ring }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
            className={cn(
              "group rounded-xl border p-4 text-left transition-all",
              bg,
              statusFilter === key
                ? `${border} ring-2 ${ring} shadow-sm`
                : `${border} hover:shadow-sm`
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn("h-4 w-4", color)} />
              <span className={cn("text-xs font-medium", color)}>
                {strings.statusLabels[key]}
              </span>
            </div>
            <p className={cn("text-2xl font-semibold tabular-nums", color)}>
              {statusCounts[key]}
            </p>
          </button>
        ))}
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={lang === "en" ? "Search... (Ctrl+K)" : "Tìm kiếm... (Ctrl+K)"}
          className="pl-9"
        />
      </div>

      <CustomerTable
        customers={filteredCustomers}
        basePath="/customers"
        showAdminActions={false}
        readOnly={true}
        i18n={strings.customerTable}
      />
    </div>
  );
}