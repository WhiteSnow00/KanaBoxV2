export type PublicLang = "vi" | "en";

export function normalizePublicLang(value: string | null | undefined): PublicLang {
  return value === "en" || value === "vi" ? value : "vi";
}

const STRINGS = {
  vi: {
    languageLabel: "Ngôn ngữ",
    languageOptions: {
      vi: "Tiếng Việt",
      en: "English",
    },
    membersHeading: "Thành viên",
    membersCount: (count: number) => `Tổng cộng có ${count} thành viên`,
    statusLegendLabel: "Màu trạng thái:",
    statusLabels: {
      none: "Chưa có thanh toán",
      active: "Còn hạn",
      due: "Sắp đến hạn",
      grace: "Quá hạn (cao su)",
      expired: "Hết hạn",
    },
    customerTable: {
      emptyTitle: "Chưa có thành viên nào",
      emptySubtitle: "",
      headers: {
        name: "Tên",
        status: "Trạng thái",
        endDate: "Ngày hết hạn",
        latestPayment: "Thanh toán gần nhất",
        months: "Số tháng",
        note: "Ghi chú",
        actions: "Thao tác",
      },
      noPayment: "Chưa có thanh toán",
      view: "Xem →",
      formatMonths: (months: number) => `${months} tháng`,
    },
    customerDetail: {
      subscriptionStatusHeading: "Trạng thái đăng ký",
      currentPeriodEnds: "Hết hạn kỳ hiện tại",
      latestPayment: "Thanh toán gần nhất",
      paidDate: "Ngày thanh toán",
      months: "Số tháng",
      note: "Ghi chú",
      noPaymentHistory: "Chưa có lịch sử thanh toán.",
    },
  },
  en: {
    languageLabel: "Language",
    languageOptions: {
      vi: "Vietnamese",
      en: "English",
    },
    membersHeading: "Members",
    membersCount: (count: number) => `Total ${count} members`,
    statusLegendLabel: "Status colors:",
    statusLabels: {
      none: "No Payment",
      active: "Active",
      due: "Due",
      grace: "Grace",
      expired: "Expired",
    },
    customerTable: {
      emptyTitle: "No members yet",
      emptySubtitle: "",
      headers: {
        name: "Name",
        status: "Status",
        endDate: "Expiry date",
        latestPayment: "Latest payment",
        months: "Months",
        note: "Note",
        actions: "Actions",
      },
      noPayment: "No payment",
      view: "View →",
      formatMonths: (months: number) =>
        `${months} ${months === 1 ? "month" : "months"}`,
    },
    customerDetail: {
      subscriptionStatusHeading: "Subscription status",
      currentPeriodEnds: "Current period ends",
      latestPayment: "Latest payment",
      paidDate: "Paid date",
      months: "Months",
      note: "Note",
      noPaymentHistory: "No payment history.",
    },
  },
} as const;

export type PublicStrings = (typeof STRINGS)[PublicLang];

export function getPublicStrings(lang: PublicLang): PublicStrings {
  return STRINGS[lang];
}

