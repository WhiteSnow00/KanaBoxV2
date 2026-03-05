export function parseDateOnly(dateString: string): Date {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD.`);
  }

  const [, year, month, day] = match;
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    0, 0, 0, 0
  );

  if (
    date.getFullYear() !== parseInt(year, 10) ||
    date.getMonth() !== parseInt(month, 10) - 1 ||
    date.getDate() !== parseInt(day, 10)
  ) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return date;
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDateOnly(): string {
  return formatDateOnly(new Date());
}

export function addDaysDateOnly(dateString: string, days: number): string {
  const date = parseDateOnly(dateString);
  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
}

export function diffDaysDateOnly(dateA: string, dateB: string): number {
  const a = parseDateOnly(dateA);
  const b = parseDateOnly(dateB);

  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.round((utcA - utcB) / msPerDay);
}

export function addMonthsDateOnly(dateString: string, months: number): string {
  const date = parseDateOnly(dateString);
  const originalDay = date.getDate();

  const targetMonth = date.getMonth() + months;
  date.setMonth(targetMonth);

  if (date.getDate() !== originalDay) {
    date.setDate(0);
  }

  return formatDateOnly(date);
}

export function addMonthsAsDays(dateString: string, months: number): string {
  return addMonthsDateOnly(dateString, months);
}

export function getMonthBucket(dateString: string): string {
  const date = parseDateOnly(dateString);
  const day = date.getDate();

  if (day >= 6) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const month = String(prev.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getRevenueBucketRange(monthBucket: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthBucket.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const start = `${year}-${String(month).padStart(2, "0")}-06`;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-05`;

  return { start, end };
}

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

export function isValidDateOnly(dateString: string): boolean {
  try {
    parseDateOnly(dateString);
    return true;
  } catch {
    return false;
  }
}

export function compareDateOnly(a: string, b: string): number {
  return diffDaysDateOnly(a, b);
}
