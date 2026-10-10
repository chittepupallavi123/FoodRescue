import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  transporter ??= nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } });
  return transporter;
}
export async function sendActionEmail(to: string, subject: string, link: string, action: 'verify' | 'reset') {
  const mailer = getTransporter();
  if (!mailer) return false;
  const label = action === 'verify' ? 'Verify your FoodRescue email' : 'Reset your FoodRescue password';
  await mailer.sendMail({ from: env.SMTP_FROM, to, subject, text: `${label}: ${link}
If you did not request this, you can ignore this email.`, html: `<p>${label}</p><p><a href="${link}">Continue securely</a></p><p>If you did not request this, you can ignore this email.</p>` });
  return true;
}
