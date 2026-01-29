/**
 * Type definition file for local-adapter.js
 * This helps TypeScript understand the shape of our local adapter module
 */

declare module './local-adapter.js' {
  import { Pool } from 'pg';
  const pool: Pool;
  export default pool;
}