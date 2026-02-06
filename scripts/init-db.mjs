import fs from "node:fs";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

const envPath = fs.existsSync(".env.local")
  ? ".env.local"
  : fs.existsSync(".env")
    ? ".env"
    : null;

if (envPath) {
  dotenv.config({ path: envPath });
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "subscription";

if (!uri) {
  throw new Error("MONGODB_URI environment variable is required.");
}

function isKeyEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const customers = db.collection("customers");

    await customers.updateMany(
      { displayName: { $exists: false }, name: { $type: "string" } },
      [{ $set: { displayName: "$name" } }]
    );

    const missingDisplayName = await customers
      .find({ displayName: { $exists: false } })
      .project({ _id: 1 })
      .limit(20)
      .toArray();
    if (missingDisplayName.length > 0) {
      throw new Error(
        `Some customers are missing displayName: ${missingDisplayName
          .map((d) => d._id)
          .join(", ")}`
      );
    }

    const indexesBefore = await customers.indexes();

    const wrongUniqueNameIndex = indexesBefore.find(
      (i) => i.unique && isKeyEqual(i.key, { name: 1 })
    );
    if (wrongUniqueNameIndex) {
      await customers.dropIndex(wrongUniqueNameIndex.name);
    }

    const indexesAfter = await customers.indexes();
    const displayNameIndex = indexesAfter.find((i) =>
      isKeyEqual(i.key, { displayName: 1 })
    );

    if (!displayNameIndex) {
      await customers.createIndex(
        { displayName: 1 },
        { unique: true, name: "ux_customers_displayName" }
      );
    } else if (!displayNameIndex.unique || displayNameIndex.name !== "ux_customers_displayName") {
      await customers.dropIndex(displayNameIndex.name);
      await customers.createIndex(
        { displayName: 1 },
        { unique: true, name: "ux_customers_displayName" }
      );
    }
  } finally {
    await client.close();
  }
}

await main();
