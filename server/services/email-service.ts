import { Resend } from "resend";
import nodemailer from "nodemailer";

let connectionSettings: any;

async function getCredentials() {
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: "noreply@resend.dev",
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" +
    hostname +
    "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    },
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email,
  };
}

async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail,
  };
}

function getSmtpTransporter() {
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.GMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;

  if (!smtpUser || !smtpPassword) {
    console.error("❌ SMTP credentials missing!");
    console.error(`SMTP_USER / GMAIL_USER: ${smtpUser ? "SET" : "NOT SET"}`);
    console.error(`SMTP_PASSWORD / GMAIL_PASSWORD: ${smtpPassword ? "SET (length: " + smtpPassword.length + ")" : "NOT SET"}`);
    throw new Error("SMTP credentials not configured");
  }

  console.log(`📧 Attempting SMTP connection to ${smtpHost}:${smtpPort}...`);
  console.log(`   User: ${smtpUser}`);
  console.log(`   Password length: ${smtpPassword.length} characters`);

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    name: smtpHost === "smtp.gmail.com" ? "gmail.com" : smtpHost,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
    debug: false,
  });
}

interface EmailParams {
  to: string;
  from: string | { name: string; email: string };
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const smtpPassword = process.env.SMTP_PASSWORD || process.env.GMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;

    if (smtpUser && smtpPassword) {
      const transporter = getSmtpTransporter();

      // **CRITICAL FIX for OUTLOOK:** 
      // Do NOT use a custom display name like "Maharashtra Water <email@gmail.com>"
      // Just use the bare email address. Outlook flags free @gmail.com accounts 
      // that try to spoof names from scripts.
      const fromAddress = smtpUser;

      const mailOptions: any = {
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        // **CRITICAL FIX for OUTLOOK:** Add headers to make it look like a real client
        headers: {
          "X-Mailer": "Microsoft Outlook 16.0", // Trick some basic filters
          "MIME-Version": "1.0",
          ...params.headers
        }
      };

      if (params.html) mailOptions.html = params.html;
      if (params.text) mailOptions.text = params.text;
      if (params.replyTo) mailOptions.replyTo = params.replyTo;

      await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${params.to} via SMTP`);
      return true;
    } else {
      const { client, fromEmail } = await getUncachableResendClient();

      const fromAddress =
        typeof params.from === "string"
          ? params.from
          : fromEmail || "noreply@resend.dev";

      const emailData: any = {
        from: fromAddress,
        to: params.to,
        subject: params.subject,
      };

      if (params.html) emailData.html = params.html;
      if (params.text) emailData.text = params.text;
      if (params.replyTo) emailData.reply_to = params.replyTo;

      await client.emails.send(emailData);
      console.log(`Email sent successfully to ${params.to} via Resend`);
      return true;
    }
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

export async function sendTicketCreatedEmail(
  userEmail: string,
  ticketId: string,
  title: string,
  description: string,
): Promise<boolean> {
  const subject = `Maharashtra Water Platform - Ticket ${ticketId} Created`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Maharashtra Water Infrastructure</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Support Ticket Confirmation</p>
      </div>

      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #1f2937; margin-top: 0;">Ticket Successfully Created</h2>
        <p style="color: #374151; font-size: 16px;">Dear User,</p>
        <p style="color: #374151;">Your support request has been received and assigned ticket number <strong>${ticketId}</strong>.</p>

        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #1f2937;">Ticket Information:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 100px;"><strong>Ticket ID:</strong></td><td style="padding: 8px 0; color: #1f2937;">${ticketId}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Subject:</strong></td><td style="padding: 8px 0; color: #1f2937;">${title}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; vertical-align: top;"><strong>Details:</strong></td><td style="padding: 8px 0; color: #1f2937;">${description}</td></tr>
          </table>
        </div>

        <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #065f46;"><strong>Next Steps:</strong></p>
          <p style="margin: 5px 0 0 0; color: #065f46;">Our technical support team will review your request and respond within 24-48 hours. You can track your ticket status anytime in the helpdesk portal.</p>
        </div>

        <p style="color: #374151;">Thank you for using Maharashtra Water Infrastructure Management Platform.</p>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated notification from Maharashtra Water Infrastructure Management Platform.<br>
            Please do not reply to this email. For support, create a new ticket in the helpdesk portal.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    from: "Maharashtra Water Support",
    replyTo: "noreply@maharashtrawater.gov.in",
    subject,
    html,
    text: `Maharashtra Water Infrastructure - Ticket ${ticketId} Created\n\nDear User,\n\nYour support request has been received.\n\nTicket ID: ${ticketId}\nSubject: ${title}\nDetails: ${description}\n\nOur team will review and respond within 24-48 hours.\n\nThank you,\nMaharashtra Water Infrastructure Support Team`,
    headers: {
      "X-Priority": "3",
      "X-MSMail-Priority": "Normal",
      Importance: "Normal",
    },
  });
}

export async function sendTicketReopenedEmail(
  userEmail: string,
  ticketId: string,
  title: string,
  reopenReason: string,
): Promise<boolean> {
  const subject = `Maharashtra Water Platform - Ticket ${ticketId} Reopened`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Maharashtra Water Infrastructure</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Ticket Reopened Notice</p>
      </div>

      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #1f2937; margin-top: 0;">Ticket Successfully Reopened</h2>
        <p style="color: #374151; font-size: 16px;">Dear User,</p>
        <p style="color: #374151;">Your ticket <strong>${ticketId}</strong> has been reopened based on your request. Our support team will review your concerns and provide additional assistance.</p>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #1f2937;">Reopen Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 100px;"><strong>Ticket ID:</strong></td><td style="padding: 8px 0; color: #1f2937;">${ticketId}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Subject:</strong></td><td style="padding: 8px 0; color: #1f2937;">${title}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Status:</strong></td><td style="padding: 8px 0; color: #f59e0b;"><strong>Open</strong></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; vertical-align: top;"><strong>Reason for Reopening:</strong></td><td style="padding: 8px 0; color: #1f2937;">${reopenReason}</td></tr>
          </table>
        </div>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af;"><strong>What Happens Next?</strong></p>
          <p style="margin: 5px 0 0 0; color: #1e40af;">Our technical support team has been notified and will review your reopened ticket within 24-48 hours. We'll work to address your concerns and provide a resolution as quickly as possible.</p>
        </div>

        <p style="color: #374151;">Thank you for bringing this to our attention. We appreciate your patience as we work to resolve your issue completely.</p>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated notification from Maharashtra Water Infrastructure Management Platform.<br>
            Please do not reply to this email. For support updates, check your ticket status in the helpdesk portal.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    from: "Maharashtra Water Support",
    replyTo: "noreply@maharashtrawater.gov.in",
    subject,
    html,
    text: `Maharashtra Water Infrastructure - Ticket ${ticketId} Reopened\n\nDear User,\n\nYour support ticket has been reopened.\n\nTicket ID: ${ticketId}\nSubject: ${title}\nStatus: Open\nReason for Reopening: ${reopenReason}\n\nOur team will review your ticket within 24-48 hours.\n\nThank you,\nMaharashtra Water Infrastructure Support Team`,
    headers: {
      "X-Priority": "2",
      "X-MSMail-Priority": "High",
      Importance: "High",
    },
  });
}

export async function sendVendorNotificationEmail(
  vendorEmail: string,
  vendorName: string,
  ticketId: string,
  title: string,
  description: string,
  region: string,
  userName: string,
  userEmail: string,
  userPhone: string,
  priority: string,
  category: string,
  specificIssue: string,
): Promise<boolean> {
  const subject = `🚨 New Support Request - ${region} Region - Ticket ${ticketId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ JJM  SWSM IoT Maharashtra</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">NEW SUPPORT REQUEST - ACTION REQUIRED</p>
      </div>

      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #1f2937; margin-top: 0;">Hello ${vendorName},</h2>
        <p style="color: #374151; font-size: 16px;">A new support ticket has been raised in the <strong>${region}</strong> region that requires your attention.</p>

        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #991b1b;">📋 Ticket Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 130px;"><strong>Ticket ID:</strong></td><td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${ticketId}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Priority:</strong></td><td style="padding: 8px 0;"><span style="color: ${priority === "High" ? "#dc2626" : priority === "Medium" ? "#f59e0b" : "#10b981"}; font-weight: bold;">${priority}</span></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Region:</strong></td><td style="padding: 8px 0; color: #1f2937;">${region}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Category:</strong></td><td style="padding: 8px 0; color: #1f2937;">${category}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Issue Type:</strong></td><td style="padding: 8px 0; color: #1f2937;">${specificIssue}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Subject:</strong></td><td style="padding: 8px 0; color: #1f2937;">${title}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; vertical-align: top;"><strong>Description:</strong></td><td style="padding: 8px 0; color: #1f2937;">${description}</td></tr>
          </table>
        </div>

        <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">👤 Reported By:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 130px;"><strong>Name:</strong></td><td style="padding: 8px 0; color: #1f2937;">${userName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td><td style="padding: 8px 0; color: #1f2937;"><a href="mailto:${userEmail}" style="color: #2563eb;">${userEmail}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Phone:</strong></td><td style="padding: 8px 0; color: #1f2937;"><a href="tel:${userPhone}" style="color: #2563eb;">${userPhone}</a></td></tr>
          </table>
        </div>

        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;"><strong>⏰ Action Required:</strong></p>
          <p style="margin: 5px 0 0 0; color: #92400e;">Please review this ticket and take appropriate action. Contact the user directly if you need additional information. Update the ticket status in the admin dashboard once resolved.</p>
        </div>

        <p style="color: #374151;">This is an automated notification from Maharashtra Water Infrastructure Management Platform.</p>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            You are receiving this email because you are registered as a vendor for the <strong>${region}</strong> region.<br>
            For technical support, please contact the platform administrator.
          </p>
        </div>
      </div>
    </div>
  `;

  const textVersion = `
🚨 NEW SUPPORT REQUEST - MAHARASHTRA WATER INFRASTRUCTURE

Hello ${vendorName},

A new support ticket has been raised in the ${region} region.

TICKET DETAILS:
- Ticket ID: ${ticketId}
- Priority: ${priority}
- Region: ${region}
- Category: ${category}
- Issue Type: ${specificIssue}
- Subject: ${title}
- Description: ${description}

REPORTED BY:
- Name: ${userName}
- Email: ${userEmail}
- Phone: ${userPhone}

ACTION REQUIRED:
Please review this ticket and take appropriate action. Contact the user if you need more information.

---
This is an automated notification from Maharashtra Water Infrastructure Management Platform.
You are receiving this email because you are registered as a vendor for the ${region} region.
  `;

  return sendEmail({
    to: vendorEmail,
    from: "Maharashtra Water Alert",
    replyTo: userEmail,
    subject,
    html,
    text: textVersion,
    headers: {
      "X-Priority":
        priority === "High" ? "1" : priority === "Medium" ? "2" : "3",
      "X-MSMail-Priority": priority === "High" ? "High" : "Normal",
      Importance: priority === "High" ? "High" : "Normal",
    },
  });
}

export async function sendTicketResolvedEmail(
  userEmail: string,
  ticketId: string,
  title: string,
  adminComments?: string,
): Promise<boolean> {
  const subject = `Maharashtra Water Platform - Ticket ${ticketId} Resolved`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #059669; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Maharashtra Water Infrastructure</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Ticket Resolution Notice</p>
      </div>

      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #1f2937; margin-top: 0;">Ticket Successfully Resolved</h2>
        <p style="color: #374151; font-size: 16px;">Dear User,</p>
        <p style="color: #374151;">Great news! Your support ticket <strong>${ticketId}</strong> has been resolved by our technical team.</p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 20px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #1f2937;">Resolution Summary:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 100px;"><strong>Ticket ID:</strong></td><td style="padding: 8px 0; color: #1f2937;">${ticketId}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Subject:</strong></td><td style="padding: 8px 0; color: #1f2937;">${title}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Status:</strong></td><td style="padding: 8px 0; color: #059669;"><strong>Resolved</strong></td></tr>
            ${adminComments ? `<tr><td style="padding: 8px 0; color: #6b7280; vertical-align: top;"><strong>Solution:</strong></td><td style="padding: 8px 0; color: #1f2937;">${adminComments}</td></tr>` : ""}
          </table>
        </div>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af;"><strong>Need Additional Help?</strong></p>
          <p style="margin: 5px 0 0 0; color: #1e40af;">If you need further assistance or have follow-up questions, please feel free to create a new support ticket through our helpdesk portal.</p>
        </div>

        <p style="color: #374151;">Thank you for using Maharashtra Water Infrastructure Management Platform. We appreciate your patience and are glad we could help resolve your issue.</p>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated notification from Maharashtra Water Infrastructure Management Platform.<br>
            Please do not reply to this email. For new support requests, create a ticket in the helpdesk portal.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    from: "Maharashtra Water Support",
    replyTo: "noreply@maharashtrawater.gov.in",
    subject,
    html,
    text: `Maharashtra Water Infrastructure - Ticket ${ticketId} Resolved\n\nDear User,\n\nYour support ticket has been resolved.\n\nTicket ID: ${ticketId}\nSubject: ${title}\nStatus: Resolved\n${adminComments ? `Solution: ${adminComments}\n` : ""}\nThank you for using our platform.\n\nMaharashtra Water Infrastructure Support Team`,
    headers: {
      "X-Priority": "3",
      "X-MSMail-Priority": "Normal",
      Importance: "Normal",
    },
  });
}

export async function sendDailyAlertEmail(
  engineerEmail: string,
  engineerName: string,
  alertsData: any[],
): Promise<boolean> {
  const subject = `🚨 Critical Water Scheme Alerts - Action Required`;

  let alertsHtml = '';
  alertsData.forEach(alert => {
    alertsHtml += `
      <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #991b1b;">Scheme: ${alert.scheme_name} (ID: ${alert.scheme_id})</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${alert.chlorine_issue ? `<tr><td style="padding: 4px 0; color: #dc2626; font-weight: bold; width: 120px;">Chlorine:</td><td style="padding: 4px 0; color: #1f2937;">${alert.chlorine_value} mg/L (Below 0.2)</td></tr>` : ''}
          ${alert.pressure_issue ? `<tr><td style="padding: 4px 0; color: #dc2626; font-weight: bold; width: 120px;">Pressure:</td><td style="padding: 4px 0; color: #1f2937;">${alert.pressure_value} Bar (Below 0.2)</td></tr>` : ''}
          ${alert.lpcd_issue ? `<tr><td style="padding: 4px 0; color: #dc2626; font-weight: bold; width: 120px;">LPCD:</td><td style="padding: 4px 0; color: #1f2937;">${alert.lpcd_value} (Below 55)</td></tr>` : ''}
          ${alert.water_issue ? `<tr><td style="padding: 4px 0; color: #dc2626; font-weight: bold; width: 120px;">Water Supply:</td><td style="padding: 4px 0; color: #1f2937;">${alert.water_value} (Zero Supply)</td></tr>` : ''}
          ${alert.village_name ? `<tr><td style="padding: 4px 0; color: #6b7280; width: 120px;">Village:</td><td style="padding: 4px 0; color: #1f2937;">${alert.village_name}</td></tr>` : ''}
          ${alert.esr_name ? `<tr><td style="padding: 4px 0; color: #6b7280; width: 120px;">ESR:</td><td style="padding: 4px 0; color: #1f2937;">${alert.esr_name}</td></tr>` : ''}
        </table>
      </div>
    `;
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ JJM SWSM IoT Maharashtra</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">DAILY CRITICAL ALERTS REPORT</p>
      </div>

      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #1f2937; margin-top: 0;">Hello ${engineerName},</h2>
        <p style="color: #374151; font-size: 16px;">The following schemes assigned to you have critical parameters falling below acceptable thresholds as of today.</p>

        ${alertsHtml}

        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;"><strong>⏰ Action Required:</strong></p>
          <p style="margin: 5px 0 0 0; color: #92400e;">Please review these schemes immediately to resolve the underlying issues. If the issue persists after 48 hours please visit <a href="https://dashboard1.mahajaliot.in/helpdesk/issue-reporting" style="color: #2563eb; text-decoration: underline;">dashboard1.mahajaliot.in</a> and write the remark on issue reports page.</p>
        </div>

        <p style="color: #374151;">This is an automated notification from Maharashtra Water Infrastructure Management Platform.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: engineerEmail,
    from: "Maharashtra Water Alert",
    subject,
    html,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "High",
    },
  });
}
