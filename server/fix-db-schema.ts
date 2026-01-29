
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;

async function fixSchema() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not found in environment");
    process.exit(1);
  }

  console.log("Connecting to database to apply schema fixes...");
  const pool = new Pool({ connectionString });

  try {
    const client = await pool.connect();
    console.log("Connected successfully.");

    process.stdout.write("Checking for 'water_supply' column... ");
    const hasWaterSupply = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='scheme_status' AND column_name='water_supply';
    `);

    if (hasWaterSupply.rowCount === 0) {
      console.log("Missing. Adding...");
      await client.query(`ALTER TABLE scheme_status ADD COLUMN water_supply TEXT;`);
    } else {
      console.log("Already exists.");
    }

    process.stdout.write("Checking for 'active' column... ");
    const hasActive = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='scheme_status' AND column_name='active';
    `);

    if (hasActive.rowCount === 0) {
      console.log("Missing. Adding...");
      await client.query(`ALTER TABLE scheme_status ADD COLUMN active BOOLEAN DEFAULT TRUE;`);
    } else {
      console.log("Already exists.");
    }

    console.log("Ensuring unique constraint on (scheme_id, block)...");
    try {
      await client.query(`
        ALTER TABLE scheme_status 
        ADD CONSTRAINT scheme_status_scheme_id_block_unique UNIQUE (scheme_id, block);
      `);
      console.log("Constraint added.");
    } catch (e: any) {
      if (e.code === '42P16') {
        console.log("Constraint already exists.");
      } else {
        console.warn("Could not add unique constraint (might have duplicates):", e.message);
      }
    }

    console.log("Adding performance indexes...");
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_scheme_status_region" ON "scheme_status" ("region");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_scheme_status_scheme_id" ON "scheme_status" ("scheme_id");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_scheme_status_block" ON "scheme_status" ("block");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_scheme_status_scheme_name" ON "scheme_status" ("scheme_name");`);

    console.log("Schema fixes applied successfully!");
    client.release();
  } catch (error) {
    console.error("Error applying schema fixes:", error);
  } finally {
    await pool.end();
  }
}

fixSchema();
