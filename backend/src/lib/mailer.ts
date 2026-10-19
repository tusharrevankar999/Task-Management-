import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";

let transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  } else {
    // In local development without explicit SMTP, use JSON transport with direct console preview
    // to avoid outbound network blocks or slow SMTP handshakes.
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    console.log("ℹ️ [Mailer] Local development mode: previewing emails in console.");
  }

  return transporter;
}

export interface SendPasswordResetMailOptions {
  to: string;
  name: string;
  resetUrl: string;
  token: string;
}

export async function sendPasswordResetEmail(
  options: SendPasswordResetMailOptions
): Promise<void> {
  const mailer = await getTransporter();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 16px; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .logo { font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.5px; margin-bottom: 24px; text-align: center; }
    h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px 0; }
    p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0; }
    .btn { display: block; width: 100%; box-sizing: border-box; text-align: center; background-color: #111827; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; margin: 24px 0; }
    .token-box { background: #f3f4f6; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 14px; color: #1f2937; word-break: break-all; margin-bottom: 20px; text-align: center; }
    .footer { font-size: 12px; color: #9ca3af; text-align: center; margin-top: 28px; border-top: 1px solid #f3f4f6; padding-top: 18px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Task Management App</div>
    <h1>Password Reset Request</h1>
    <p>Hi ${options.name},</p>
    <p>We received a request to reset your password. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.</p>
    
    <a href="${options.resetUrl}" class="btn">Reset Password</a>

    <p style="font-size: 12px; color: #6b7280;">If the button doesn't work, copy and paste this link in your browser:</p>
    <p style="font-size: 12px; word-break: break-all; color: #2563eb;">${options.resetUrl}</p>

    <div class="footer">
      If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </div>
  </div>
</body>
</html>
  `;

  const info = await mailer.sendMail({
    from: env.SMTP_FROM,
    to: options.to,
    subject: "Reset your password",
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("📬 [Email Preview URL]:", previewUrl);
  }
}
