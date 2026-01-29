/**
 * Database operations with retry functionality
 * This module provides functions to execute database operations with automatic retry
 * to handle temporary connection issues like "terminating connection due to administrator command"
 */

import { getDB } from './db';
import { sql } from 'drizzle-orm';

// Default configuration for retry operations
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second initial delay, will be increased with backoff
const DEFAULT_RETRY_MESSAGES = [
  "terminating connection due to administrator command",
  "Connection terminated unexpectedly",
  "Connection refused",
  "Client has encountered a connection error"
];

/**
 * Execute a database operation with automatic retry on connection errors
 * @param operation Function to execute that returns a Promise
 * @param maxRetries Maximum number of retry attempts
 * @param initialDelay Initial delay before first retry in milliseconds
 * @param retryOnMessages Array of error message fragments that trigger retry
 * @returns Result of the operation
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = DEFAULT_MAX_RETRIES,
  initialDelay = DEFAULT_RETRY_DELAY,
  retryOnMessages = DEFAULT_RETRY_MESSAGES
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a retryable error
      const errorMessage = error?.message || String(error);
      const shouldRetry = retryOnMessages.some(errText => errorMessage.includes(errText));
      
      if (!shouldRetry) {
        console.error(`Non-retryable database error: ${errorMessage}`);
        throw error;
      }
      
      if (attempt <= maxRetries) {
        const waitTime = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`Database operation failed on attempt ${attempt}/${maxRetries + 1}. Retrying in ${waitTime}ms...`);
        console.warn(`Error was: ${errorMessage}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error(`Failed database operation after ${maxRetries + 1} attempts`);
        throw error;
      }
    }
  }
  
  // This should never be reached, but TypeScript requires a return value
  throw lastError;
}

/**
 * Get a database connection and execute a query with automatic retry
 * @param queryFn Function that takes a database connection and returns a Promise with query result
 * @returns Result of the query
 */
export async function queryWithRetry<T>(
  queryFn: (db: any) => Promise<T>,
  maxRetries = DEFAULT_MAX_RETRIES
): Promise<T> {
  return executeWithRetry(async () => {
    const db = await getDB();
    return queryFn(db);
  }, maxRetries);
}

/**
 * Execute a SQL query with automatic retry
 * @param query SQL query to execute
 * @param params Parameters for the query
 * @returns Result of the query
 */
export async function executeSqlWithRetry<T>(
  query: string,
  params: any[] = []
): Promise<T> {
  return queryWithRetry(async (db) => {
    return db.execute(sql.raw(query));
  });
}

/**
 * Insert records into a table with automatic retry
 * @param table Table to insert into
 * @param values Values to insert
 * @returns Result of the insert operation
 */
export async function insertWithRetry<T>(
  table: any,
  values: any
): Promise<T> {
  return queryWithRetry(async (db) => {
    return db.insert(table).values(values).returning();
  });
}

/**
 * Update records in a table with automatic retry
 * @param table Table to update
 * @param values Values to update
 * @param whereClause Where clause for the update
 * @returns Result of the update operation
 */
export async function updateWithRetry<T>(
  table: any,
  values: any,
  whereClause: any
): Promise<T> {
  return queryWithRetry(async (db) => {
    return db.update(table).set(values).where(whereClause);
  });
}

/**
 * Select records from a table with automatic retry
 * @param table Table to select from
 * @param whereClause Where clause for the select
 * @returns Result of the select operation
 */
export async function selectWithRetry<T>(
  table: any,
  whereClause?: any
): Promise<T> {
  return queryWithRetry(async (db) => {
    const query = db.select().from(table);
    return whereClause ? query.where(whereClause) : query;
  });
}

/**
 * Delete records from a table with automatic retry
 * @param table Table to delete from
 * @param whereClause Where clause for the delete
 * @returns Result of the delete operation
 */
export async function deleteWithRetry<T>(
  table: any,
  whereClause: any
): Promise<T> {
  return queryWithRetry(async (db) => {
    return db.delete(table).where(whereClause);
  });
}