import fs from 'fs';
import path from 'path';

const filePath = path.resolve('server/services/email-service.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Find the last known part of sendEngineerCredentialsEmail
const cutPoint = content.indexOf('<tr>\n              <td style="padding: 8px 0; color: #64748b;"><strong>Username / Login ID:');
if (cutPoint === -1) {
  console.error('Cut point not found!');
  process.exit(1);
}

const cleanEnding = `              <td style="padding: 8px 0; color: #64748b;"><strong>Username / Login ID:</strong></td>
              <td style="padding: 8px 0;"><code style="background-color: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 4px; font-size: 14px; font-weight: 700; font-family: monospace;">\${params.username}</code></td>
            </tr>
            \${params.password ? \`
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Password:</strong></td>
              <td style="padding: 8px 0;"><code style="background-color: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-size: 14px; font-weight: 700; font-family: monospace;">\${params.password}</code></td>
            </tr>\` : ''}
            \${typeof params.assignedSchemesCount === 'number' && params.assignedSchemesCount > 0 ? \`
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Assigned Schemes:</strong></td>
              <td style="padding: 8px 0; color: #059669; font-weight: 600;">\${params.assignedSchemesCount} Scheme(s) in your jurisdiction</td>
            </tr>\` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="\${loginUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 6px; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);" target="_blank">
            👉 Click Here to Log In to Engineer Portal
          </a>
        </div>

        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; padding: 12px 14px; margin: 20px 0; font-size: 12px; color: #991b1b; line-height: 1.5;">
          <strong>Security Notice:</strong>
          <br>
          • Please keep your login credentials strictly confidential and do not forward this email.
          • Upon logging in, you will have access to IoT Progress, LPCD compliance, chlorine levels, water pressure, and offline sensors for your assigned schemes.
        </div>

        <p style="color: #64748b; font-size: 12px; margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 14px; line-height: 1.4;">
          This is an official automated dispatch from the MahaJal IoT Platform, Water Supply and Sanitation Department, Government of Maharashtra.
        </p>
      </div>
    </div>
  \`;

  return sendEmail({
    to: params.toEmail,
    from: "MahaJal IoT Login Credentials",
    cc: [
      "semmjpbelapur@gmail.com",
      "rishikesh.salunkhe@cstech.ai",
      "umesh.shelake@cstech.ai",
      "naganath.patil@cstech.ai",
      "aniruddha.dhumale@cstech.ai",
    ],
    subject,
    html,
  });
}

export interface RealtimeAlertEmailParams {
  toEmail: string;
  engineerName: string;
  scheme_id: string;
  scheme_name: string;
  region?: string;
  circle?: string;
  division?: string;
  sub_division?: string;
  block?: string;
  village_name?: string;
  esr_name?: string;
  alert_type: string;
  alert_value: string | number;
  flow_rate?: number | null;
  telemetry_timestamp?: Date | string | null;
  ticket_id?: string;
}

export async function sendRealtimeSingleAlertEmail(params: RealtimeAlertEmailParams): Promise<boolean> {
  const baseUrl = process.env.APP_BASE_URL || 'https://dashboard1.mahajaliot.in';
  const dashboardUrl = \`\${baseUrl.replace(/\\/$/, '')}/alerts-progress\`;
  const engineerDashboardUrl = \`\${baseUrl.replace(/\\/$/, '')}/engineer\`;

  const isCritical = params.alert_type.toLowerCase().includes('low') || params.alert_type.toLowerCase().includes('offline');
  const badgeColor = params.alert_type.toLowerCase().includes('high') ? '#7c3aed' : params.alert_type.toLowerCase().includes('offline') ? '#ea580c' : '#dc2626';

  const formattedTime = params.telemetry_timestamp
    ? new Date(params.telemetry_timestamp).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const subject = \`🚨 [REAL-TIME ALERT] \${params.alert_type.toUpperCase()} - \${params.scheme_name} (ID: \${params.scheme_id})\`;

  const html = \`
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: \${badgeColor}; color: #ffffff; padding: 18px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">⚠️ JJM SWSM REAL-TIME ALERT</h1>
        <p style="margin: 4px 0 0 0; opacity: 0.95; font-size: 13px;">Water Infrastructure Telemetry Monitoring</p>
      </div>

      <div style="padding: 24px; background-color: #ffffff;">
        <p style="color: #1e293b; font-size: 15px; margin-top: 0;">Hello <strong>\${params.engineerName}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
          The following critical telemetry condition was detected in real-time on your assigned scheme.
        </p>

        <!-- Alert Summary Box -->
        <div style="background-color: #fff1f2; border: 2px solid \${badgeColor}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="display: inline-block; background-color: \${badgeColor}; color: #ffffff; font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 10px;">
            \${params.alert_type}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Parameter / Value:</strong></td>
              <td style="padding: 6px 0; color: #991b1b; font-weight: 800; font-size: 16px;">\${params.alert_value}</td>
            </tr>
            \${params.flow_rate !== undefined && params.flow_rate !== null ? \`
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Active Flow Rate:</strong></td>
              <td style="padding: 6px 0; color: #047857; font-weight: 700;">\${params.flow_rate} m³/h (Water Flowing)</td>
            </tr>\` : ''}
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Timestamp (IST):</strong></td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">\${formattedTime}</td>
            </tr>
            \${params.ticket_id ? \`
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Ticket ID:</strong></td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: 700;">\${params.ticket_id}</td>
            </tr>\` : ''}
          </table>
        </div>

        <!-- Scheme Location Hierarchy -->
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #334155; text-transform: uppercase; font-weight: 700;">📍 Scheme & Asset Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; width: 120px;"><strong>Scheme:</strong></td>
              <td style="padding: 4px 0; color: #1e293b;"><strong>\${params.scheme_name}</strong> (ID: \${params.scheme_id})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Village:</strong></td>
              <td style="padding: 4px 0; color: #1e293b;">\${params.village_name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Reservoir / ESR:</strong></td>
              <td style="padding: 4px 0; color: #1e293b;">\${params.esr_name || 'N/A'}</td>
            </tr>
            \${params.region ? \`
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Region / Circle:</strong></td>
              <td style="padding: 4px 0; color: #1e293b;">\${params.region}\${params.circle ? \` / \${params.circle}\` : ''}</td>
            </tr>\` : ''}
          </table>
        </div>

        <!-- Action Links -->
        <div style="text-align: center; margin: 24px 0;">
          <a href="\${engineerDashboardUrl}" style="background-color: #16a34a; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 700; display: inline-block; margin-right: 10px; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.25);" target="_blank">
            ✅ Acknowledge in Portal
          </a>
          <a href="\${dashboardUrl}" style="background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);" target="_blank">
            📊 View Alerts Progress
          </a>
        </div>

        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; font-size: 12px; color: #92400e; line-height: 1.4;">
          <strong>Notice:</strong> This is a real-time critical notification from the MahaJal IoT SCADA telemetry system. Please take immediate corrective action.
        </div>

        <p style="color: #94a3b8; font-size: 11px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 10px; text-align: center;">
          Water Supply & Sanitation Department, Government of Maharashtra • MahaJal IoT Platform
        </p>
      </div>
    </div>
  \`;

  return sendEmail({
    to: params.toEmail,
    from: "MahaJal Real-Time Alerts",
    subject,
    html,
    headers: {
      "X-Priority": isCritical ? "1" : "2",
      "X-MSMail-Priority": isCritical ? "High" : "Normal",
      Importance: isCritical ? "High" : "Normal",
    },
  });
}
`;

content = content.substring(0, cutPoint) + cleanEnding;
fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated email-service.ts');
