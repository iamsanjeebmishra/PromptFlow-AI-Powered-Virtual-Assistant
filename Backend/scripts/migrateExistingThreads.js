
import "dotenv/config";
import mongoose from "mongoose";

import User from "../models/User.js";
import Thread from "../models/Thread.js";

const migrateExistingThreads = async () => {
    try {
        const targetEmail = process.argv[2]?.trim().toLowerCase();
        const shouldConfirm = process.argv[3] === "--confirm";

        if (!targetEmail) {
            throw new Error(
                "Usage: node scripts/migrateExistingThreads.js <email> [--confirm]"
            );
        }

        if (!process.env.MONGODB_URL) {
            throw new Error("MONGODB_URL is missing from .env");
        }

        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Connected to MongoDB");

        // Find the account that will own the old conversations
        const user = await User.findOne({ email: targetEmail });

        if (!user) {
            throw new Error(
                `No registered user found with email: ${targetEmail}`
            );
        }

        // Find conversations without an owner
        const legacyFilter = {
            $or: [
                { userId: { $exists: false } },
                { userId: null }
            ]
        };

        const legacyCount = await Thread.countDocuments(legacyFilter);

        console.log("\nMigration preview:");
        console.log("Target user:", user.name);
        console.log("Email:", user.email);
        console.log("Conversations to migrate:", legacyCount);

        if (!shouldConfirm) {
            console.log("\nDRY RUN: No database changes were made.");
            console.log(
                `To apply: node scripts/migrateExistingThreads.js ${targetEmail} --confirm`
            );
            return;
        }

        // Assign only unowned conversations to the selected account
        const result = await Thread.updateMany(
            legacyFilter,
            {
                $set: {
                    userId: user._id
                }
            }
        );

        console.log("\nMigration completed successfully!");
        console.log("Conversations updated:", result.modifiedCount);
        console.log("Owner:", user.email);

    } catch (error) {
        console.error("Migration failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

migrateExistingThreads();
