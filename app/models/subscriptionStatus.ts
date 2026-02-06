import { diffDaysDateOnly, getTodayDateOnly } from "~/utils/date";

export const DUE_SOON_DAYS = 3;
export const GRACE_DAYS = 7;

export const BASE_PRICE_VND = 50000;
export const BASE_PRICE_USD = 2;

export const USD_TO_VND_RATE = 25800;

export type Currency = "VND" | "USD";

export type SubscriptionStatus = "active" | "due" | "grace" | "expired" | "none";

export interface StatusInfo {
  status: SubscriptionStatus;
  className: string;
  label: string;
  daysToEnd: number | null;
  daysPastEnd: number | null;
}

export function computeStatus(endDate: string | null): StatusInfo {
  const today = getTodayDateOnly();

  if (!endDate) {
    return {
      status: "none",
      className: "bg-gray-100 border-gray-400",
      label: "Chưa có thanh toán",
      daysToEnd: null,
      daysPastEnd: null,
    };
  }

  const daysToEnd = diffDaysDateOnly(endDate, today);
  const daysPastEnd = -daysToEnd;

  if (daysToEnd > DUE_SOON_DAYS) {
    return {
      status: "active",
      className: "bg-status-active border-status-active-border",
      label: "Còn hạn",
      daysToEnd,
      daysPastEnd: null,
    };
  }

  if (daysToEnd >= 0 && daysToEnd <= DUE_SOON_DAYS) {
    return {
      status: "due",
      className: "bg-status-due border-status-due-border",
      label: "Sắp đến hạn",
      daysToEnd,
      daysPastEnd: null,
    };
  }

  if (daysPastEnd > 0 && daysPastEnd <= GRACE_DAYS) {
    return {
      status: "grace",
      className: "bg-status-grace border-status-grace-border",
      label: "Quá hạn (cao su)",
      daysToEnd: null,
      daysPastEnd,
    };
  }

  return {
    status: "expired",
    className: "bg-status-expired border-status-expired-border",
    label: "Hết hạn",
    daysToEnd: null,
    daysPastEnd,
  };
}

export function calculateRecommendedMonths(
  amount: number,
  currency: Currency
): number {
  if (amount <= 0) return 1;

  const basePrice = currency === "VND" ? BASE_PRICE_VND : BASE_PRICE_USD;
  return Math.max(1, Math.floor(amount / basePrice));
}
