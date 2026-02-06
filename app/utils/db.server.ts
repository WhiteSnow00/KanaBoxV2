import { MongoClient, Db } from "mongodb";

declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "subscription";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required.");
}

let clientPromise: Promise<MongoClient>;

if (!global.__mongoClientPromise) {
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  global.__mongoClientPromise = client.connect();
}
clientPromise = global.__mongoClientPromise;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(MONGODB_DB_NAME);
}

export async function closeDbConnection(): Promise<void> {
  if (global.__mongoClientPromise) {
    const client = await clientPromise;
    await client.close();
    global.__mongoClientPromise = undefined;
  }
}