import { ObjectId } from "mongodb";
import { getDb } from "~/utils/db.server";
import {
  addMonthsDateOnly,
  getMonthBucket,
} from "~/utils/date";
import {
  DUE_SOON_DAYS,
  GRACE_DAYS,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
  USD_TO_VND_RATE,
  type Currency,
  type SubscriptionStatus,
  type StatusInfo,
  computeStatus,
  calculateRecommendedMonths,
} from "~/models/subscriptionStatus";

export {
  DUE_SOON_DAYS,
  GRACE_DAYS,
  BASE_PRICE_VND,
  BASE_PRICE_USD,
  USD_TO_VND_RATE,
  type Currency,
  type SubscriptionStatus,
  type StatusInfo,
  computeStatus,
  calculateRecommendedMonths,
};

export interface Payment {
  _id: ObjectId;
  customerId: ObjectId;
  paidDate: string; // YYYY-MM-DD
  currency: Currency;
  amount: number;
  months: number;
  endDate: string; // YYYY-MM-DD (computed from paidDate + months*30)
  note?: string;
  createdAt: Date;
}

export interface PaymentInput {
  customerId: string;
  paidDate: string;
  currency: Currency;
  amount: number;
  months: number;
  note?: string;
}

export async function createPayment(input: PaymentInput): Promise<Payment> {
  const db = await getDb();
  const collection = db.collection<Payment>("payments");

  const endDate = addMonthsDateOnly(input.paidDate, input.months);

  const sanitizedAmount =
    input.currency === "VND"
      ? Math.round(input.amount)
      : Math.round(input.amount * 100) / 100;

  const now = new Date();
  const payment: Omit<Payment, "_id"> = {
    customerId: new ObjectId(input.customerId),
    paidDate: input.paidDate,
    currency: input.currency,
    amount: sanitizedAmount,
    months: input.months,
    endDate,
    note: input.note?.trim() || undefined,
    createdAt: now,
  };

  const result = await collection.insertOne(payment as Payment);

  return {
    _id: result.insertedId,
    ...payment,
  } as Payment;
}

export async function listPaymentsForCustomer(
  customerId: string
): Promise<Payment[]> {
  if (!ObjectId.isValid(customerId)) {
    return [];
  }

  const db = await getDb();
  const collection = db.collection<Payment>("payments");

  return collection
    .find({ customerId: new ObjectId(customerId) })
    .sort({ paidDate: -1 })
    .toArray();
}

export async function getLatestPaymentForCustomer(
  customerId: string
): Promise<Payment | null> {
  if (!ObjectId.isValid(customerId)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Payment>("payments");

  return collection
    .find({ customerId: new ObjectId(customerId) })
    .sort({ paidDate: -1 })
    .limit(1)
    .next();
}

export async function listLatestPaymentsForAllCustomers(): Promise<
  Map<string, Payment>
> {
  const db = await getDb();
  const collection = db.collection<Payment>("payments");

  const results = await collection
    .aggregate<{
      _id: ObjectId;
      latestPayment: Payment;
    }>([
      {
        $sort: { paidDate: -1 },
      },
      {
        $group: {
          _id: "$customerId",
          latestPayment: { $first: "$$ROOT" },
        },
      },
    ])
    .toArray();

  const map = new Map<string, Payment>();
  for (const result of results) {
    map.set(result._id.toString(), result.latestPayment);
  }

  return map;
}

export async function listPaymentsForRevenueWindow(
  startDate: string,
  endDate: string
): Promise<Payment[]> {
  const db = await getDb();
  const collection = db.collection<Payment>("payments");

  return collection
    .find({
      paidDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
    .toArray();
}

export interface MonthlyAllocation {
  monthBucket: string; // YYYY-MM
  amount: number;
  currency: Currency;
}

export function allocatePaymentToMonths(
  payment: Payment
): MonthlyAllocation[] {
  const allocations: MonthlyAllocation[] = [];
  const { amount, months, currency, paidDate } = payment;

  const baseAmount = currency === "VND" 
    ? Math.floor(amount / months)
    : Math.floor((amount / months) * 100) / 100;
  
  const totalBase = currency === "VND"
    ? baseAmount * months
    : Math.round(baseAmount * months * 100) / 100;
  
  const remainder = currency === "VND"
    ? amount - totalBase
    : Math.round((amount - totalBase) * 100) / 100;
  
  const remainderPerMonth = currency === "VND"
    ? 1
    : 0.01;
  
  const monthsWithExtra = currency === "VND"
	    ? remainder
	    : Math.round(remainder / 0.01);

	  for (let i = 0; i < months; i++) {
	    const periodStart = addMonthsDateOnly(paidDate, i);
	    const monthBucket = getMonthBucket(periodStart);

	    const monthAmount = currency === "VND"
	      ? baseAmount + (i < monthsWithExtra ? remainderPerMonth : 0)
	      : Math.round((baseAmount + (i < monthsWithExtra ? remainderPerMonth : 0)) * 100) / 100;

    allocations.push({
      monthBucket,
      amount: monthAmount,
      currency,
    });
  }

	  return allocations;
	}

export async function getPaymentById(id: string): Promise<Payment | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Payment>("payments");

  return collection.findOne({ _id: new ObjectId(id) });
}

export async function updatePayment(
  input: {
    id: string;
    paidDate: string;
    currency: Currency;
    amount: number;
    months: number;
    note?: string;
  }
): Promise<Payment | null> {
  const { id, ...updates } = input;
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Payment>("payments");

  const endDate = addMonthsDateOnly(updates.paidDate, updates.months);

  const sanitizedAmount =
    updates.currency === "VND"
      ? Math.round(updates.amount)
      : Math.round(updates.amount * 100) / 100;

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        paidDate: updates.paidDate,
        currency: updates.currency,
        amount: sanitizedAmount,
        months: updates.months,
        endDate,
        note: updates.note?.trim() || undefined,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function deletePayment(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const db = await getDb();
  const collection = db.collection<Payment>("payments");

  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export function computeMonthlyTotals(
  payments: Payment[],
  monthBuckets: string[]
): Map<string, { VND: number; USD: number; convertedVnd: number }> {
  const totals = new Map<string, { VND: number; USD: number; convertedVnd: number }>();

  for (const bucket of monthBuckets) {
    totals.set(bucket, { VND: 0, USD: 0, convertedVnd: 0 });
  }

  // Revenue reporting: count the full payment amount in the paid month.
  for (const payment of payments) {
    const bucketKey = getMonthBucket(payment.paidDate);
    const current = totals.get(bucketKey);
    if (!current) continue;

    if (payment.currency === "VND") {
      current.VND += Math.round(payment.amount);
    } else {
      current.USD = Math.round((current.USD + payment.amount) * 100) / 100;
    }
  }

  for (const [bucket, data] of totals) {
    data.convertedVnd = Math.round(data.VND + data.USD * USD_TO_VND_RATE);
    totals.set(bucket, data);
  }

  return totals;
}
