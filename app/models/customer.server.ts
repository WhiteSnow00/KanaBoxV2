import { ObjectId } from "mongodb";
import { getDb, getMongoClient } from "~/utils/db.server";
import { getTodayDateOnly } from "~/utils/date";
import type { Payment } from "~/models/payment.server";

export interface NameHistoryEntry {
  name: string;
  changedAt: string;
}

export interface Customer {
  _id: ObjectId;
  displayName: string;
  nameHistory?: NameHistoryEntry[];
  note?: string;
  isPublicHidden?: boolean;
  hiddenAt?: Date;
  hiddenReason?: string;
  renewalCancelled?: boolean;
  cancelledAt?: string;
  isArchived?: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInput {
  displayName: string;
  note?: string;
}

export interface ArchivedCustomerDeletionResult {
  deletedCustomerCount: number;
  deletedPaymentCount: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findArchivedByName(name: string): Promise<Customer | null> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  return collection.findOne({
    displayName: { $regex: `^${escapeRegExp(name.trim())}$`, $options: "i" },
    isArchived: true,
  });
}

export async function unarchiveCustomer(id: string, note?: string): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const target = await collection.findOne({ _id: new ObjectId(id) });
  if (!target) {
    return null;
  }

  const conflict = await collection.findOne({
    _id: { $ne: new ObjectId(id) },
    displayName: {
      $regex: `^${escapeRegExp(target.displayName.trim())}$`,
      $options: "i",
    },
    isArchived: { $ne: true },
  });

  if (conflict) {
    const error = new Error(
      `Active customer with displayName "${target.displayName}" already exists`
    ) as Error & { code?: number };
    error.code = 11000;
    throw error;
  }

  const setOps: Record<string, unknown> = {
    isArchived: false,
    updatedAt: new Date(),
  };

  const unsetOps: Record<string, ""> = {
    archivedAt: "",
  };

  if (note !== undefined) {
    if (note && note.trim()) {
      setOps.note = note.trim();
    } else {
      unsetOps.note = "";
    }
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: setOps,
      $unset: unsetOps,
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const now = new Date();
  const trimmedNote = input.note?.trim();
  const customer: Omit<Customer, "_id"> = {
    displayName: input.displayName.trim(),
    ...(trimmedNote ? { note: trimmedNote } : {}),
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(customer as Customer);

  return {
    _id: result.insertedId,
    ...customer,
  } as Customer;
}

export async function listCustomers(
  searchQuery?: string,
  options?: { publicOnly?: boolean; includeArchived?: boolean }
): Promise<Customer[]> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const filter: Record<string, unknown> = {};

  if (!options?.includeArchived) {
    filter.isArchived = { $ne: true };
  }

  if (options?.publicOnly) {
    filter.isPublicHidden = { $ne: true };
  }

  if (searchQuery && searchQuery.trim()) {
    filter.displayName = { $regex: escapeRegExp(searchQuery.trim()), $options: "i" };
  }

  return collection
    .find(filter)
    .sort({ displayName: 1 })
    .toArray();
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  return collection.findOne({ _id: new ObjectId(id) });
}

export async function updateCustomerNote(
  id: string,
  note: string | undefined
): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const trimmedNote = note?.trim();
  const setOps: Record<string, unknown> = { updatedAt: new Date() };
  const updateDoc: Record<string, unknown> = { $set: setOps };

  if (trimmedNote) {
    setOps.note = trimmedNote;
  } else {
    updateDoc.$unset = { note: "" };
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    updateDoc,
    { returnDocument: "after" }
  );

  return result;
}

export async function countCustomers(): Promise<number> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  return collection.countDocuments({ isArchived: { $ne: true } });
}

export async function customerExistsByDisplayName(
  name: string,
  excludeArchived = true
): Promise<boolean> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const filter: Record<string, unknown> = {
    displayName: { $regex: `^${escapeRegExp(name.trim())}$`, $options: "i" },
  };
  if (excludeArchived) {
    filter.isArchived = { $ne: true };
  }
  const count = await collection.countDocuments(filter);
  return count > 0;
}

export async function hideCustomerFromPublic(
  id: string,
  reason?: string
): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        isPublicHidden: true,
        hiddenAt: new Date(),
        hiddenReason: reason || "cancelled",
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function unhideCustomer(id: string): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        isPublicHidden: false,
        updatedAt: new Date(),
      },
      $unset: {
        hiddenAt: "",
        hiddenReason: "",
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function setRenewalCancelled(
  id: string,
  cancelled: boolean
): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const update: Record<string, unknown> = {
    $set: {
      renewalCancelled: cancelled,
      updatedAt: new Date(),
    },
  };

  if (cancelled) {
    (update.$set as { cancelledAt: string }).cancelledAt = getTodayDateOnly();
  } else {
    update.$unset = { cancelledAt: "" };
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    update,
    { returnDocument: "after" }
  );

  return result;
}

export async function archiveCustomer(id: string): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        isArchived: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function deleteArchivedCustomerWithPayments(
  id: string
): Promise<ArchivedCustomerDeletionResult | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const customerObjectId = new ObjectId(id);
  const client = await getMongoClient();
  const db = await getDb();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const customers = db.collection<Customer>("customers");
      const payments = db.collection<Payment>("payments");

      const customer = await customers.findOne(
        { _id: customerObjectId },
        { session }
      );
      if (!customer || !customer.isArchived) {
        return null;
      }

      const deletedPayments = await payments.deleteMany(
        { customerId: customerObjectId },
        { session }
      );
      const deletedCustomer = await customers.deleteOne(
        { _id: customerObjectId, isArchived: true },
        { session }
      );

      if (deletedCustomer.deletedCount !== 1) {
        throw new Error("Archived customer delete failed");
      }

      return {
        deletedCustomerCount: deletedCustomer.deletedCount,
        deletedPaymentCount: deletedPayments.deletedCount,
      };
    });

    return result ?? null;
  } finally {
    await session.endSession();
  }
}

/** @deprecated Use archiveCustomer instead. This soft-archives and never deletes from the DB. */
export async function deleteCustomer(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isArchived: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
  return result.modifiedCount === 1;
}

export async function updateCustomer(
  id: string,
  input: { displayName: string; note?: string }
): Promise<Customer | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const current = await collection.findOne({ _id: new ObjectId(id) });
  if (!current) {
    return null;
  }

  const today = getTodayDateOnly();

  const nextDisplayName = input.displayName.trim();

  const setOps: Record<string, unknown> = {
    displayName: nextDisplayName,
    updatedAt: new Date(),
  };

  const unsetOps: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(input, "note")) {
    const nextNote = input.note?.trim() || "";
    if (nextNote) {
      setOps.note = nextNote;
    } else {
      unsetOps.note = "";
    }
  }

  const updateDoc: Record<string, unknown> = { $set: setOps };
  if (Object.keys(unsetOps).length > 0) {
    updateDoc.$unset = unsetOps;
  }

  if (current.displayName !== nextDisplayName) {
    const historyEntry: NameHistoryEntry = {
      name: current.displayName,
      changedAt: today,
    };
    updateDoc.$push = { nameHistory: historyEntry };
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    updateDoc,
    { returnDocument: "after" }
  );

  return result;
}

export async function cancelRenewal(id: string): Promise<Customer | null> {
  return setRenewalCancelled(id, true);
}

export async function resumeRenewal(id: string): Promise<Customer | null> {
  return setRenewalCancelled(id, false);
}
