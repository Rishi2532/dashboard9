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

function getGmailTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword =
    process.env.GMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error("❌ Gmail credentials missing!");
    console.error(`GMAIL_USER: ${gmailUser ? "SET" : "NOT SET"}`);
    console.error(`GMAIL_PASSWORD: ${gmailAppPassword ? "SET (length: " + gmailAppPassword.length + ")" : "NOT SET"}`);
    throw new Error("Gmail credentials not configured");
  }

  console.log(`📧 Attempting Gmail SMTP connection...`);
  console.log(`   User: ${gmailUser}`);
  console.log(`   Password length: ${gmailAppPassword.length} characters`);
  console.log(`   Expected App Password format: 16 lowercase letters`);

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
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
    if (
      process.env.GMAIL_USER &&
      (process.env.GMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD)
    ) {
      const transporter = getGmailTransporter();

      const fromAddress =
        typeof params.from === "string"
          ? `${params.from} <${process.env.GMAIL_USER}>`
          : `${params.from} <${process.env.GMAIL_USER}>`;

      const mailOptions: any = {
        from: fromAddress,
        to: params.to,
        subject: params.subject,
      };

      if (params.html) mailOptions.html = params.html;
      if (params.text) mailOptions.text = params.text;
      if (params.replyTo) mailOptions.replyTo = params.replyTo;

      await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${params.to} via Gmail SMTP`);
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
        <h1 style="margin: 0; font-size: 24px;">⚠️ Maharashtra Water Infrastructure</h1>
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
