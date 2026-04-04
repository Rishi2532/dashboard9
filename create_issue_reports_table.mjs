import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const sql = `CREATE TABLE IF NOT EXISTS issue_reports (
  id SERIAL PRIMARY KEY,
  problem_level TEXT NOT NULL,
  region TEXT NOT NULL,
  scheme_id TEXT NOT NULL,
  scheme_name TEXT NOT NULL,
  village_name TEXT,
  esr_name TEXT,
  status_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  sensor_type TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  resolution_remark TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  creator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);`;

pool.query(sql)
  .then(() => {
    console.log("Table issue_reports created successfully");
    process.exit(0);
  })
  .catch(err => {
    console.error("Error creating table:", err);
    process.exit(1);
  });
