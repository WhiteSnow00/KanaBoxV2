import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";
import { useState, useRef, useEffect } from "react";
import { Users, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import { listCustomers } from "~/models/customer.server";
import {
  computeStatus,
  listLatestPaymentsForAllCustomers,
} from "~/models/payment.server";
import { getTodayDateOnly } from "~/utils/date";
import CustomerTable from "~/components/CustomerTable";
import PublicLanguageSelect from "~/components/PublicLanguageSelect";
import { getPublicStrings, normalizePublicLang } from "~/i18n/public";
import { PageHeader, SearchField, StatCard } from "~/components/shared";

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
  { key: "active", icon: CheckCircle, color: "text-emerald-600", dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-400" },
  { key: "due", icon: Clock, color: "text-amber-600", dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-400" },
  { key: "grace", icon: AlertTriangle, color: "text-orange-600", dot: "bg-orange-500", bg: "bg-orange-50", border: "border-orange-200", ring: "ring-orange-400" },
  { key: "expired", icon: XCircle, color: "text-red-600", dot: "bg-red-500", bg: "bg-red-50", border: "border-red-200", ring: "ring-red-400" },
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
  const trimmedSearch = searchTerm.trim();
  const isFilteredEmpty = customers.length > 0 && filteredCustomers.length === 0;
  const filteredEmptyTitle = trimmedSearch
    ? lang === "en"
      ? `No members match "${trimmedSearch}"`
      : `Không có thành viên khớp "${trimmedSearch}"`
    : lang === "en"
      ? "No members with this status"
      : "Không có thành viên ở trạng thái này";
  const filteredEmptySubtitle = lang === "en"
    ? "Try another search or status filter."
    : "Thử đổi từ khóa hoặc bộ lọc trạng thái.";

  return (
    <div className="space-y-6">
      <PageHeader
        title={strings.membersHeading}
        description={strings.membersCount(filteredCustomers.length)}
      >
        <PublicLanguageSelect
          lang={lang}
          label={strings.languageLabel}
          optionVi={strings.languageOptions.vi}
          optionEn={strings.languageOptions.en}
        />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 shadow-sm">
        <span className="font-medium text-zinc-600">{strings.statusLegendLabel}</span>
        {statusCardConfig.map(({ key, dot }) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            {strings.statusLabels[key]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={Users}
          label={strings.membersHeading}
          count={totalCount}
          color="text-indigo-500"
          bg="bg-white"
          border={statusFilter === null ? "border-indigo-300" : "border-zinc-200"}
          ring="ring-indigo-200"
          isSelected={statusFilter === null}
          onClick={() => setStatusFilter(null)}
        />
        {statusCardConfig.map(({ key, icon, color, bg, border, ring }) => (
          <StatCard
            key={key}
            icon={icon}
            label={strings.statusLabels[key]}
            count={statusCounts[key]}
            color={color}
            bg={bg}
            border={border}
            ring={ring}
            isSelected={statusFilter === key}
            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
          />
        ))}
      </div>

      <SearchField
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={lang === "en" ? "Search... (Ctrl+K)" : "Tìm kiếm... (Ctrl+K)"}
        className="max-w-xs"
        inputRef={searchInputRef}
      />

      <CustomerTable
        customers={filteredCustomers}
        basePath="/customers"
        showAdminActions={false}
        readOnly={true}
        i18n={strings.customerTable}
        isFilteredEmpty={isFilteredEmpty}
        filteredEmptyTitle={filteredEmptyTitle}
        filteredEmptySubtitle={filteredEmptySubtitle}
      />
    </div>
  );
}
