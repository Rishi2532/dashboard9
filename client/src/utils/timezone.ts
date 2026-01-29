/**
 * Utility functions for consistent timestamp formatting in Indian Standard Time (IST)
 * This ensures all users see timestamps in IST regardless of their location or browser timezone
 * PERMANENT FIX: When this app is remixed, all timestamps will display consistently in IST
 */

/**
 * Formats a timestamp to Indian Standard Time (IST) with full date and time
 * @param timestamp - ISO string timestamp or Date object
 * @returns Formatted string in IST timezone or "Never" if timestamp is null/undefined
 */
export function formatToIST(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return "Never";
  
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting timestamp to IST:', error);
    return typeof timestamp === 'string' ? timestamp : timestamp?.toString() || "Invalid Date";
  }
}

/**
 * Formats a timestamp to IST with short date format
 * @param timestamp - ISO string timestamp or Date object
 * @returns Formatted string in IST timezone (DD/MM/YYYY, HH:MM AM/PM)
 */
export function formatToISTShort(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return "Never";
  
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting timestamp to IST short:', error);
    return typeof timestamp === 'string' ? timestamp : timestamp?.toString() || "Invalid Date";
  }
}

/**
 * Gets the current time in IST
 * @returns Current timestamp formatted in IST
 */
export function getCurrentIST(): string {
  return formatToIST(new Date());
}