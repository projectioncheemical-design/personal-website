import nodemailer from "nodemailer";

export function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("SMTP credentials are not configured");
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";
  const transporter = getTransport();
  await transporter.sendMail({ from, to, subject, html });
}
