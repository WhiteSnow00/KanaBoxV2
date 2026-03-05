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
            name: "ix_customers_displayName_unique",
            key: { displayName: 1 },
            unique: true,
        },
    ],
    payments: [
        {
            name: "ix_payments_customerId_paidDate_desc",
            key: { customerId: 1, paidDate: -1 },
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

        if (keysMatch && uniqueMatch) {
            console.log(`  [OK] Index "${desired.name}" already exists and is correct.`);
            return;
        }

        console.log(`  [FIX] Index "${desired.name}" exists but is incorrect. Dropping and recreating...`);
        await collection.dropIndex(desired.name);
    }

    console.log(`  [CREATE] Creating index "${desired.name}"...`);
    const options = { name: desired.name };
    if (desired.unique) {
        options.unique = true;
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
