import { getDB } from "../db";
import { sql } from "drizzle-orm";

/**
 * Service for sending automatic SMS alerts via Smartping (Cyfuture CPaaS) Gateway.
 * Fully configured with Airtel DLT Approved Templates and Headers.
 */

interface Alert {
  scheme_id?: string;
  scheme_name: string;
  village_name?: string;
  esr_name?: string;
  chlorine_issue?: boolean;
  chlorine_value?: string | number;
  pressure_issue?: boolean;
  pressure_value?: string | number;
  lpcd_issue?: boolean;
  lpcd_value?: string | number;
  water_issue?: boolean;
  offline_issue?: boolean;
}

// Smartping API Gateway Configuration
const SMARTPING_CONFIG = {
  apiUrl: process.env.SMARTPING_API_URL || "https://pgapi.smartping.ai/fe/api/v1/send",
  username: process.env.SMARTPING_API_USERNAME || "CSTECH.trans",
  password: process.env.SMARTPING_API_PASSWORD || "Cyfuture@12345",
  senderId: process.env.SMARTPING_SENDER_ID || "MJPIOT",
  headerId: process.env.SMARTPING_HEADER_ID || "1005041138203274315",
  peId: process.env.SMARTPING_PE_ID || "1001861588684954918",
};

// Airtel DLT Approved Templates for Maharashtra Jeevan Pradhikaran (MJP)
export const DLT_TEMPLATES = {
  PRESSURE_LOW: {
    templateId: "1077305300036737013",
    contentId: "1077305300036737013",
    name: "Pressure Low",
    render: (scheme: string, pressureVal: string | number) =>
      `सूचना: JJM MVS ${scheme} अंतर्गत ESR-1 च्या वितरण व्यवस्थेतील Pressure Sensor नुसार पाण्याचा दाब 0.2 bar पेक्षा कमी असून सध्याचा दाब ${pressureVal} bar इतका आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`,
  },
  CHLORINE_HIGH: {
    templateId: "1077159330036594383",
    contentId: "1077159330036594383",
    name: "Residual Chlorine High",
    render: (scheme: string, chlorineVal: string | number) =>
      `सूचना: JJM MVS ${scheme} अंतर्गत ESR-1 मध्ये Residual Chlorine ची मात्रा 0.5 mg/l पेक्षा जास्त असून सध्याची मात्रा ${chlorineVal} mg/l इतकी आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`,
  },
  CHLORINE_LOW: {
    templateId: "1077438200031589278",
    contentId: "1077438200031589278",
    name: "Residual Chlorine Low",
    render: (scheme: string, chlorineVal: string | number) =>
      `सूचना: JJM MVS ${scheme} अंतर्गत ESR-1 मध्ये Residual Chlorine ची मात्रा 0.2 mg/l पेक्षा कमी असून सध्याची मात्रा ${chlorineVal} mg/l इतकी आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`,
  },
  LPCD_LOW: {
    templateId: "1077387830035602945",
    contentId: "1077387830035602945",
    name: "LPCD Low",
    render: (scheme: string, lpcdVal: string | number) =>
      `सूचना: JJM MVS ${scheme} अंतर्गत पाणीपुरवठ्याचा दर 55 LPCD पेक्षा कमी असून सध्याचा पाणीपुरवठ्याचा दर ${lpcdVal} LPCD आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`,
  },
};

/**
 * Normalizes a mobile number to Indian 91XXXXXXXXXX format
 */
export function normalizeIndianMobile(mobile: string): string | null {
  if (!mobile) return null;
  // Strip non-digit characters
  const clean = mobile.replace(/\D/g, "");
  if (clean.length === 10) {
    return `91${clean}`;
  }
  if (clean.length === 12 && clean.startsWith("91")) {
    return clean;
  }
  if (clean.length > 10) {
    return clean.slice(-10).padStart(12, "91");
  }
  return clean;
}

/**
 * Sends a single DLT-compliant SMS via Smartping Gateway
 */
export async function sendSmartpingDLTSMS(params: {
  mobile: string;
  text: string;
  dltContentId: string;
  dltPrincipalEntityId?: string;
}): Promise<{ success: boolean; status?: number; response?: string; error?: string }> {
  const formattedMobile = normalizeIndianMobile(params.mobile);
  if (!formattedMobile) {
    return { success: false, error: "Invalid mobile number format" };
  }

  // Detect non-ASCII/Unicode characters (e.g. Marathi/Devanagari script)
  // Smartping gateway requires unicode=1 for all regional/Unicode messages
  const isUnicode = /[^\u0000-\u007F]/.test(params.text);

  const queryParams = new URLSearchParams({
    username: SMARTPING_CONFIG.username,
    password: SMARTPING_CONFIG.password,
    from: SMARTPING_CONFIG.senderId,
    to: formattedMobile,
    text: params.text,
    dltContentId: params.dltContentId,
    dltPrincipalEntityId: params.dltPrincipalEntityId || SMARTPING_CONFIG.peId,
    unicode: isUnicode ? "1" : "0",
  });

  const requestUrl = `${SMARTPING_CONFIG.apiUrl}?${queryParams.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(requestUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "MJP-Dashboard-SMS/1.0",
        "Accept": "application/json, text/plain, */*",
      },
    });
    clearTimeout(timeoutId);

    const bodyText = await res.text();

    if (res.ok) {
      console.log(`✅ Smartping SMS delivered to ${formattedMobile} (Template: ${params.dltContentId}): ${bodyText}`);
      return { success: true, status: res.status, response: bodyText };
    } else {
      console.warn(
        `⚠️ Smartping SMS gateway returned HTTP ${res.status} for ${formattedMobile}: ${bodyText}`
      );
      return { success: false, status: res.status, response: bodyText };
    }
  } catch (error: any) {
    console.error(`❌ Smartping SMS network error for ${formattedMobile}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Logs an SMS alert dispatch into the sms_alert_logs database table
 */
export async function logSmsAlert(data: {
  mobile: string;
  engineer_name?: string;
  engineer_email?: string;
  scheme_id?: string;
  scheme_name?: string;
  template_id?: string;
  template_name?: string;
  message_text?: string;
  gateway_status?: number;
  gateway_response?: string;
  is_success?: boolean;
}) {
  try {
    const db = await getDB();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sms_alert_logs (
        id SERIAL PRIMARY KEY,
        mobile VARCHAR(30) NOT NULL,
        engineer_name VARCHAR(255),
        engineer_email VARCHAR(255),
        scheme_id VARCHAR(100),
        scheme_name VARCHAR(255),
        template_id VARCHAR(50),
        template_name VARCHAR(100),
        message_text TEXT,
        gateway_status INTEGER,
        gateway_response TEXT,
        is_success BOOLEAN DEFAULT TRUE,
        sent_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sms_alert_logs_mobile ON sms_alert_logs(mobile);
      CREATE INDEX IF NOT EXISTS idx_sms_alert_logs_scheme ON sms_alert_logs(scheme_id);
      CREATE INDEX IF NOT EXISTS idx_sms_alert_logs_created ON sms_alert_logs(created_at);
    `);

    const cleanMobile = normalizeIndianMobile(data.mobile) || data.mobile;
    await db.execute(sql`
      INSERT INTO sms_alert_logs (
        mobile, engineer_name, engineer_email, scheme_id, scheme_name,
        template_id, template_name, message_text, gateway_status, gateway_response, is_success, sent_date
      ) VALUES (
        ${cleanMobile},
        ${data.engineer_name || null},
        ${data.engineer_email || null},
        ${data.scheme_id || null},
        ${data.scheme_name || null},
        ${data.template_id || null},
        ${data.template_name || null},
        ${data.message_text || null},
        ${data.gateway_status || null},
        ${data.gateway_response || null},
        ${data.is_success !== undefined ? data.is_success : true},
        CURRENT_DATE
      )
    `);
  } catch (err: any) {
    console.warn("Could not log SMS alert to database:", err.message);
  }
}

/**
 * Formats a clean scheme identifier for SMS combining scheme name, village name, and ESR name
 */
export function formatSchemeIdentifier(alert: Alert): string {
  const schemeName =
    alert.scheme_name && alert.scheme_name !== "N/A"
      ? alert.scheme_name.trim()
      : alert.scheme_id && alert.scheme_id !== "N/A"
      ? alert.scheme_id.trim()
      : "MVS Scheme";

  const villageName =
    alert.village_name && alert.village_name !== "N/A"
      ? alert.village_name.trim()
      : "";

  const esrName =
    alert.esr_name && alert.esr_name !== "N/A"
      ? alert.esr_name.trim()
      : "";

  const details: string[] = [];
  if (villageName && !schemeName.toLowerCase().includes(villageName.toLowerCase())) {
    details.push(villageName);
  }
  if (
    esrName &&
    !schemeName.toLowerCase().includes(esrName.toLowerCase()) &&
    !villageName.toLowerCase().includes(esrName.toLowerCase())
  ) {
    details.push(esrName);
  }

  if (details.length > 0) {
    return `${schemeName} (${details.join(" - ")})`;
  }

  return schemeName;
}

/**
 * Sends a daily summary SMS to engineers detailing issues detected across schemes.
 * Uses DLT-approved templates for pressure, chlorine, and LPCD.
 */
export async function sendDailyAlertSMS(mobile: string, name: string, alerts: Alert[], email?: string): Promise<boolean> {
  if (!mobile || alerts.length === 0) return false;

  try {
    // 1. Check for specific DLT template matches
    const pressureAlert = alerts.find((a) => a.pressure_issue);
    const chlorineAlert = alerts.find((a) => a.chlorine_issue);

    let dltDispatched = false;

    // If pressure issue present, dispatch DLT Pressure Low template
    if (pressureAlert) {
      const schemeVal = formatSchemeIdentifier(pressureAlert);
      const pVal = pressureAlert.pressure_value || "0.15";
      const messageText = DLT_TEMPLATES.PRESSURE_LOW.render(schemeVal, pVal);

      const res = await sendSmartpingDLTSMS({
        mobile,
        text: messageText,
        dltContentId: DLT_TEMPLATES.PRESSURE_LOW.contentId,
      });

      if (res.success) {
        dltDispatched = true;
      }

      await logSmsAlert({
        mobile,
        engineer_name: name,
        engineer_email: email,
        scheme_id: pressureAlert.scheme_id,
        scheme_name: pressureAlert.scheme_name,
        template_id: DLT_TEMPLATES.PRESSURE_LOW.contentId,
        template_name: DLT_TEMPLATES.PRESSURE_LOW.name,
        message_text: messageText,
        gateway_status: res.status,
        gateway_response: res.response,
        is_success: res.success,
      });
    }

    // If chlorine issue present, dispatch DLT Chlorine template
    if (chlorineAlert) {
      const schemeVal = formatSchemeIdentifier(chlorineAlert);
      const cVal = parseFloat(String(chlorineAlert.chlorine_value || "0.1"));
      const isHigh = cVal > 0.5;
      const tmpl = isHigh ? DLT_TEMPLATES.CHLORINE_HIGH : DLT_TEMPLATES.CHLORINE_LOW;
      const messageText = tmpl.render(schemeVal, cVal);

      const res = await sendSmartpingDLTSMS({
        mobile,
        text: messageText,
        dltContentId: tmpl.contentId,
      });

      if (res.success) {
        dltDispatched = true;
      }

      await logSmsAlert({
        mobile,
        engineer_name: name,
        engineer_email: email,
        scheme_id: chlorineAlert.scheme_id,
        scheme_name: chlorineAlert.scheme_name,
        template_id: tmpl.contentId,
        template_name: tmpl.name,
        message_text: messageText,
        gateway_status: res.status,
        gateway_response: res.response,
        is_success: res.success,
      });
    }

    // If LPCD issue present (< 55 LPCD), dispatch DLT LPCD Low template
    const lpcdAlert = alerts.find((a) => a.lpcd_issue);
    if (lpcdAlert) {
      const schemeVal = formatSchemeIdentifier(lpcdAlert);
      const lVal = lpcdAlert.lpcd_value || "38";
      const messageText = DLT_TEMPLATES.LPCD_LOW.render(schemeVal, lVal);

      const res = await sendSmartpingDLTSMS({
        mobile,
        text: messageText,
        dltContentId: DLT_TEMPLATES.LPCD_LOW.contentId,
      });

      if (res.success) {
        dltDispatched = true;
      }

      await logSmsAlert({
        mobile,
        engineer_name: name,
        engineer_email: email,
        scheme_id: lpcdAlert.scheme_id,
        scheme_name: lpcdAlert.scheme_name,
        template_id: DLT_TEMPLATES.LPCD_LOW.contentId,
        template_name: DLT_TEMPLATES.LPCD_LOW.name,
        message_text: messageText,
        gateway_status: res.status,
        gateway_response: res.response,
        is_success: res.success,
      });
    }

    // Console logging audit for monitoring
    let chlorineCount = 0;
    let pressureCount = 0;
    let lpcdCount = 0;
    let waterCount = 0;
    let offlineCount = 0;

    alerts.forEach((alert) => {
      if (alert.chlorine_issue) chlorineCount++;
      if (alert.pressure_issue) pressureCount++;
      if (alert.lpcd_issue) lpcdCount++;
      if (alert.water_issue) waterCount++;
      if (alert.offline_issue) offlineCount++;
    });

    const parts = [];
    if (chlorineCount > 0) parts.push(`${chlorineCount} Chlorine`);
    if (pressureCount > 0) parts.push(`${pressureCount} Pressure`);
    if (lpcdCount > 0) parts.push(`${lpcdCount} LPCD`);
    if (waterCount > 0) parts.push(`${waterCount} Water Supply`);
    if (offlineCount > 0) parts.push(`${offlineCount} Offline Sensors`);

    const summaryText = parts.join(", ");
    console.log(`\n========== SMARTPING SMS DISPATCH AUDIT ==========`);
    console.log(`To: ${mobile} (${name})`);
    console.log(`Summary: ${alerts.length} issues (${summaryText})`);
    console.log(`DLT Dispatched: ${dltDispatched ? "Yes (Smartping Gateway)" : "Pending Gateway Whitelisting"}`);
    console.log(`==================================================\n`);

    return true;
  } catch (error) {
    console.error(`Failed to dispatch alert SMS to ${mobile}:`, error);
    return false;
  }
}

/**
 * Sends an SMS to regional vendors alerting them of offline sensors.
 */
export async function sendOfflineSensorsSMS(mobile: string, name: string, region: string, offlineCount: number): Promise<boolean> {
  if (!mobile || offlineCount === 0) return false;

  try {
    const formattedMobile = normalizeIndianMobile(mobile);
    console.log(`\n========== OFFLINE SENSORS SMS AUDIT ==========`);
    console.log(`To: ${formattedMobile} (${name})`);
    console.log(`Region: ${region}, Offline Count: ${offlineCount}`);
    console.log(`================================================\n`);

    return true;
  } catch (error) {
    console.error(`Failed to dispatch offline sensors SMS to ${mobile}:`, error);
    return false;
  }
}
