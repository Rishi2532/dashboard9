import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const smtpHost = process.env.SMTP_HOST || "111.118.179.118";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER || "info@mahajaliot.in";
const smtpPassword = process.env.SMTP_PASSWORD || "S}p9%3ExATwtGouV";

console.log(`Testing SMTP connection to ${smtpHost}:${smtpPort} as ${smtpUser}...`);

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 15000,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Verification Failed:", error);
    process.exit(1);
  } else {
    console.log("✅ SMTP Server is ready to send messages!");
    transporter.sendMail({
      from: `"MahaJal IoT" <${smtpUser}>`,
      to: smtpUser,
      subject: "MahaJal Cloud SMTP Test Success",
      text: "The cloud SMTP configuration is working properly!",
    }).then(info => {
      console.log("✅ Test email sent successfully! Message ID:", info.messageId);
      process.exit(0);
    }).catch(err => {
      console.error("❌ Failed to send email:", err);
      process.exit(1);
    });
  }
});
