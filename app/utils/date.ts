/**
 * Date Utilities for Date-Only Operations
 * 
 * This module provides helper functions for working with dates in YYYY-MM-DD format.
 * All dates are treated as local dates.
 * No times or timezones are stored in the database.
 * 
 * Subscription months use calendar month arithmetic:
 *   endDate = addMonthsDateOnly(paidDate, months)
 * Example: 2026-02-05 + 1 month = 2026-03-05
 */

/**
 * Parse a YYYY-MM-DD string to a Date object at local midnight.
 * The resulting Date represents the start of that day in local time.
 */
export function parseDateOnly(dateString: string): Date {
  // Parse YYYY-MM-DD format
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD.`);
  }

  const [, year, month, day] = match;
  // Create date at midnight local time
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1, // Month is 0-indexed in JS Date
    parseInt(day, 10),
    0, 0, 0, 0
  );

  // Validate the date is valid (e.g., not 2023-02-30)
  if (
    date.getFullYear() !== parseInt(year, 10) ||
    date.getMonth() !== parseInt(month, 10) - 1 ||
    date.getDate() !== parseInt(day, 10)
  ) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return date;
}

/**
 * Format a Date object to YYYY-MM-DD string.
 * Uses the local date components of the Date object.
 */
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD string in local timezone.
 */
export function getTodayDateOnly(): string {
  return formatDateOnly(new Date());
}

/**
 * Add days to a date-only string and return the result as YYYY-MM-DD.
 * Can subtract days by passing negative values.
 */
export function addDaysDateOnly(dateString: string, days: number): string {
  const date = parseDateOnly(dateString);
  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
}

/**
 * Calculate the difference in days between two date-only strings.
 * Returns (dateA - dateB) in days.
 * Positive result means dateA is after dateB.
 */
export function diffDaysDateOnly(dateA: string, dateB: string): number {
  const a = parseDateOnly(dateA);
  const b = parseDateOnly(dateB);
  
  // Clear time components and get difference in milliseconds
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  
  return Math.round((utcA - utcB) / msPerDay);
}

/**
 * Add calendar months to a date-only string.
 * Keeps the same day-of-month when possible.
 * If the target month doesn't have enough days, clamps to the last day of that month.
 * Example: 2026-01-31 + 1 month = 2026-02-28 (or 29 in leap year)
 * Example: 2026-02-05 + 1 month = 2026-03-05
 */
export function addMonthsDateOnly(dateString: string, months: number): string {
  const date = parseDateOnly(dateString);
  const originalDay = date.getDate();
  
  // Add months to the date
  const targetMonth = date.getMonth() + months;
  date.setMonth(targetMonth);
  
  // If the day changed, it means we overflowed to the next month
  // (e.g., Jan 31 -> Feb 31 becomes Mar 3 or similar)
  // In this case, we want the last day of the target month
  if (date.getDate() !== originalDay) {
    // Go back to the last day of the previous month (which is our target month)
    date.setDate(0);
  }
  
  return formatDateOnly(date);
}

/**
 * @deprecated Use addMonthsDateOnly instead for calendar month arithmetic.
 * Kept for backward compatibility during migration.
 */
export function addMonthsAsDays(dateString: string, months: number): string {
  return addMonthsDateOnly(dateString, months);
}

/**
 * Calculate the calendar month bucket (YYYY-MM) for a given date-only string.
 * Used for monthly revenue aggregation.
 */
export function getMonthBucket(dateString: string): string {
  // Extract YYYY-MM from YYYY-MM-DD
  return dateString.substring(0, 7);
}

/**
 * Get the last N month buckets (YYYY-MM) from today, inclusive.
 * Returns array sorted descending (most recent first).
 */
export function getRecentMonthBuckets(count: number): string[] {
  const buckets: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    buckets.push(`${year}-${month}`);
  }
  
  return buckets;
}

/**
 * Check if a date-only string is valid.
 */
export function isValidDateOnly(dateString: string): boolean {
  try {
    parseDateOnly(dateString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compare two date-only strings.
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareDateOnly(a: string, b: string): number {
  return diffDaysDateOnly(a, b);
}
