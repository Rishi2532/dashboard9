/**
 * Service for sending automatic SMS alerts.
 * Currently uses a mock implementation that logs SMS payloads to the console.
 * Replace the console.log statements with your actual SMS provider's API logic (e.g., Twilio, Fast2SMS) when ready.
 */

interface Alert {
  scheme_id?: string;
  scheme_name: string;
  village_name?: string;
  esr_name?: string;
  chlorine_issue?: boolean;
  pressure_issue?: boolean;
  lpcd_issue?: boolean;
  water_issue?: boolean;
}

/**
 * Sends a daily summary SMS to engineers (Civil, Mechanical, Site Supervisor)
 * detailing the total count of issues detected across their schemes.
 */
export async function sendDailyAlertSMS(mobile: string, name: string, alerts: Alert[]): Promise<boolean> {
  if (!mobile || alerts.length === 0) return false;

  try {
    let chlorineCount = 0;
    let pressureCount = 0;
    let lpcdCount = 0;
    let waterCount = 0;

    alerts.forEach((alert) => {
      if (alert.chlorine_issue) chlorineCount++;
      if (alert.pressure_issue) pressureCount++;
      if (alert.lpcd_issue) lpcdCount++;
      if (alert.water_issue) waterCount++;
    });

    const parts = [];
    if (chlorineCount > 0) parts.push(`${chlorineCount} Chlorine`);
    if (pressureCount > 0) parts.push(`${pressureCount} Pressure`);
    if (lpcdCount > 0) parts.push(`${lpcdCount} LPCD`);
    if (waterCount > 0) parts.push(`${waterCount} Water Supply`);

    const summaryText = parts.join(", ");
    
    // Construct short SMS body
    const smsBody = `Alert: Dear ${name}, ${alerts.length} total issues detected across your schemes today (${summaryText}). Please check the Dashboard for details.`;

    // ----------------------------------------------------
    // TODO: Insert external SMS API call here (e.g., Twilio)
    // ----------------------------------------------------
    
    console.log(`\n========== MOCK SMS DISPATCH ==========`);
    console.log(`To: ${mobile}`);
    console.log(`Message: ${smsBody}`);
    console.log(`=======================================\n`);

    return true;
  } catch (error) {
    console.error(`Failed to send mock SMS to ${mobile}:`, error);
    return false;
  }
}

/**
 * Sends an SMS to regional vendors alerting them of offline sensors.
 */
export async function sendOfflineSensorsSMS(mobile: string, name: string, region: string, offlineCount: number): Promise<boolean> {
  if (!mobile || offlineCount === 0) return false;

  try {
    // Construct short SMS body
    const smsBody = `Alert: Dear ${name}, ${offlineCount} sensors are currently offline in the ${region} region. Please check the Dashboard immediately.`;

    // ----------------------------------------------------
    // TODO: Insert external SMS API call here (e.g., Twilio)
    // ----------------------------------------------------
    
    console.log(`\n========== MOCK SMS DISPATCH ==========`);
    console.log(`To: ${mobile}`);
    console.log(`Message: ${smsBody}`);
    console.log(`=======================================\n`);

    return true;
  } catch (error) {
    console.error(`Failed to send mock SMS to ${mobile}:`, error);
    return false;
  }
}
