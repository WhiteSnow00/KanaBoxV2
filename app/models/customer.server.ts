import { ObjectId } from "mongodb";
import { getDb } from "~/utils/db.server";
import { getTodayDateOnly } from "~/utils/date";

export interface NameHistoryEntry {
  name: string;
  changedAt: string; // YYYY-MM-DD
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
  cancelledAt?: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInput {
  displayName: string;
  note?: string;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const now = new Date();
  const customer: Omit<Customer, "_id"> = {
    displayName: input.displayName.trim(),
    note: input.note?.trim() || undefined,
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
  options?: { publicOnly?: boolean }
): Promise<Customer[]> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const filter: Record<string, unknown> = {};
  
  if (options?.publicOnly) {
    filter.isPublicHidden = { $ne: true };
  }
  
  if (searchQuery && searchQuery.trim()) {
    filter.displayName = { $regex: searchQuery.trim(), $options: "i" };
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

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        note: note?.trim() || undefined,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function countCustomers(): Promise<number> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  return collection.countDocuments();
}

export async function customerExistsByDisplayName(name: string): Promise<boolean> {
  const db = await getDb();
  const collection = db.collection<Customer>("customers");
  const count = await collection.countDocuments({
    displayName: { $regex: `^${name.trim()}$`, $options: "i" },
  });
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

export async function deleteCustomer(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const db = await getDb();
  const collection = db.collection<Customer>("customers");

  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
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

export async function deleteCustomerWithPayments(customerId: string): Promise<boolean> {
  if (!ObjectId.isValid(customerId)) {
    return false;
  }

  const db = await getDb();
  
  await db.collection("payments").deleteMany({
    customerId: new ObjectId(customerId),
  });
  
  const result = await db.collection<Customer>("customers").deleteOne({
    _id: new ObjectId(customerId),
  });
  
  return result.deletedCount === 1;
}
