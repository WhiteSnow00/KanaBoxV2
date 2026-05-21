import "dotenv/config";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "subscription";

if (!MONGODB_URI) {
    console.error("MONGODB_URI environment variable is required.");
    process.exit(1);
}

const DESIRED_INDEXES = {
    customers: [
        {
            name: "ix_customers_displayName_active_unique",
            key: { displayName: 1 },
            unique: true,
            partialFilterExpression: { isArchived: { $ne: true } },
        },
    ],
    payments: [
        {
            name: "ix_payments_customerId_paidDate_desc",
            key: { customerId: 1, paidDate: -1 },
            unique: false,
        },
        {
            name: "ix_payments_paidDate_isVoided",
            key: { paidDate: 1, isVoided: 1 },
            unique: false,
        },
        {
            name: "ix_payments_isVoided_paidDate",
            key: { isVoided: 1, paidDate: -1 },
            unique: false,
        },
    ],
};

async function ensureIndex(collection, desired) {
    const existing = await collection.indexes();
    const found = existing.find((idx) => idx.name === desired.name);

    if (found) {
        const keysMatch =
            JSON.stringify(found.key) === JSON.stringify(desired.key);
        const uniqueMatch = (found.unique || false) === desired.unique;
        const partialMatch = desired.partialFilterExpression
            ? JSON.stringify(found.partialFilterExpression) === JSON.stringify(desired.partialFilterExpression)
            : !found.partialFilterExpression;

        if (keysMatch && uniqueMatch && partialMatch) {
            console.log(`  [OK] Index "${desired.name}" already exists and is correct.`);
            return;
        }

        console.log(`  [WARN] Index "${desired.name}" exists but differs. Leaving it unchanged.`);
        return;
    }

    console.log(`  [CREATE] Creating index "${desired.name}"...`);
    const options = { name: desired.name };
    if (desired.unique) {
        options.unique = true;
    }
    if (desired.partialFilterExpression) {
        options.partialFilterExpression = desired.partialFilterExpression;
    }
    await collection.createIndex(desired.key, options);
    console.log(`  [DONE] Index "${desired.name}" created.`);
}

async function main() {
    console.log(`Connecting to MongoDB...`);
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    console.log(`Connected to database: ${MONGODB_DB_NAME}`);

    for (const [collectionName, indexes] of Object.entries(DESIRED_INDEXES)) {
        console.log(`\nCollection: ${collectionName}`);
        const collection = db.collection(collectionName);
        for (const desired of indexes) {
            await ensureIndex(collection, desired);
        }
    }

    console.log("\nDone.");
    await client.close();
}

main().catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
});
