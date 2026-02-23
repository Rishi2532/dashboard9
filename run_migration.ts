
import { db } from "./server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";

async function runMigration() {
    try {
        console.log("Running migration...");
        const sqlContent = fs.readFileSync("add_sensor_type.sql", "utf-8");
        await db.execute(sql.raw(sqlContent));
        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
