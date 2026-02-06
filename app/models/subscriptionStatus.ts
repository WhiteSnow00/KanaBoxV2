/**
 * Subscription Status Logic (Client-Safe)
 * 
 * This module contains pure status computation logic with NO database access.
 * Can be imported by both server and client code.
 */

import { diffDaysDateOnly, getTodayDateOnly } from "~/utils/date";

// Status computation constants
export const DUE_SOON_DAYS = 3;
export const GRACE_DAYS = 7;

// Base prices for subscription
export const BASE_PRICE_VND = 50000;
export const BASE_PRICE_USD = 2;

// FX rate for USD to VND conversion
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

/**
 * Compute subscription status based on endDate and today's date.
 * 
 * Status rules:
 * - ACTIVE (GREEN): today < endDate - DUE_SOON_DAYS
 * - DUE (YELLOW): today >= endDate - DUE_SOON_DAYS AND today <= endDate
 * - GRACE (ORANGE): today > endDate AND today <= endDate + GRACE_DAYS
 * - EXPIRED (RED): today > endDate + GRACE_DAYS
 */
export function computeStatus(endDate: string | null): StatusInfo {
  const today = getTodayDateOnly();

  // No end date means no payment history
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
  const daysPastEnd = -daysToEnd; // Positive if expired

  // ACTIVE: today < endDate - DUE_SOON_DAYS
  if (daysToEnd > DUE_SOON_DAYS) {
    return {
      status: "active",
      className: "bg-status-active border-status-active-border",
      label: "Còn hạn",
      daysToEnd,
      daysPastEnd: null,
    };
  }

  // DUE: endDate - DUE_SOON_DAYS <= today <= endDate
  if (daysToEnd >= 0 && daysToEnd <= DUE_SOON_DAYS) {
    return {
      status: "due",
      className: "bg-status-due border-status-due-border",
      label: "Sắp đến hạn",
      daysToEnd,
      daysPastEnd: null,
    };
  }

  // GRACE: endDate < today <= endDate + GRACE_DAYS
  if (daysPastEnd > 0 && daysPastEnd <= GRACE_DAYS) {
    return {
      status: "grace",
      className: "bg-status-grace border-status-grace-border",
      label: "Quá hạn (cao su)",
      daysToEnd: null,
      daysPastEnd,
    };
  }

  // EXPIRED: today > endDate + GRACE_DAYS
  return {
    status: "expired",
    className: "bg-status-expired border-status-expired-border",
    label: "Hết hạn",
    daysToEnd: null,
    daysPastEnd,
  };
}

/**
 * Calculate recommended months based on amount and currency.
 * - VND: max(1, floor(amount / 50000))
 * - USD: max(1, floor(amount / 2))
 */
export function calculateRecommendedMonths(
  amount: number,
  currency: Currency
): number {
  if (amount <= 0) return 1;

  const basePrice = currency === "VND" ? BASE_PRICE_VND : BASE_PRICE_USD;
  return Math.max(1, Math.floor(amount / basePrice));
}
