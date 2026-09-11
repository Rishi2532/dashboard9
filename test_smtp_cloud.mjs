import nodemailer from "nodemailer";
import dotenv from "dotenv";
import net from "net";

dotenv.config();

const smtpHost = process.env.SMTP_HOST || "111.118.179.118";
const smtpUser = process.env.SMTP_USER || "info@mahajaliot.in";
const smtpPassword = process.env.SMTP_PASSWORD || "S}p9%3ExATwtGouV";

function checkPort(host, port, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      status = true;
      socket.destroy();
      resolve({ port, open: true });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ port, open: false, error: "Timed out" });
    });
    socket.on("error", (err) => {
      socket.destroy();
      resolve({ port, open: false, error: err.message });
    });

    socket.connect(port, host);
  });
}

async function run() {
  console.log(`\n🔍 Checking outbound network connectivity to ${smtpHost}...`);
  const ports = [587, 465, 25, 2525, 2096, 443];
  const results = await Promise.all(ports.map(p => checkPort(smtpHost, p)));

  for (const res of results) {
    if (res.open) {
      console.log(`✅ Port ${res.port}: OPEN & REACHABLE`);
    } else {
      console.log(`❌ Port ${res.port}: BLOCKED / UNREACHABLE (${res.error})`);
    }
  }

  const smtpCandidatePorts = [587, 465, 25, 2525];
  const openPort = results.find(r => r.open && smtpCandidatePorts.includes(r.port))?.port;
  if (!openPort) {
    console.error(`\n❌ None of the standard SMTP ports (587, 465, 25) could connect from this server.`);
    console.error(`Please check Windows Firewall Outbound Rules or Cloud Security Group outbound rules.`);
    process.exit(1);
  }

  console.log(`\n📧 Testing nodemailer authentication using OPEN port ${openPort}...`);
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: openPort,
    secure: openPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
  });

  try {
    await transporter.verify();
    console.log(`✅ Authentication succeeded on port ${openPort}!`);

    const info = await transporter.sendMail({
      from: `"MahaJal IoT" <${smtpUser}>`,
      to: smtpUser,
      subject: `MahaJal Cloud SMTP Test Success (Port ${openPort})`,
      text: `SMTP on port ${openPort} is working properly!`,
    });
    console.log(`✅ Test email sent successfully! Message ID:`, info.messageId);
    console.log(`\n👉 Set SMTP_PORT=${openPort} in your .env file!`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ Authentication/Send failed on port ${openPort}:`, err);
    process.exit(1);
  }
}

run();

