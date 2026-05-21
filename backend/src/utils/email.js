// email.js — Real email via nodemailer when SMTP_HOST is set; console fallback otherwise.
//
// Gmail quick-start:
//   1. Enable 2-Step Verification on your Google account
//   2. Visit https://myaccount.google.com/apppasswords
//   3. Create an App Password (Mail → Other → "SuperMart")
//   4. Set these in .env:
//        SMTP_HOST=smtp.gmail.com
//        SMTP_PORT=587
//        SMTP_USER=you@gmail.com
//        SMTP_PASS=xxxx xxxx xxxx xxxx   ← 16-char App Password
//        SMTP_FROM=SuperMart <you@gmail.com>

import nodemailer from 'nodemailer';
import { logger } from './logger.js';

// Build a reusable transporter (lazy-singleton pattern)
let _transporter = null;

function getTransporter() {
  const host = process.env.SMTP_HOST;

  // No SMTP config → return null (will console-log instead)
  if (!host) return null;

  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host,
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // true only for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

// ── Core send function ────────────────────────────────────────────────────────

export async function sendEmail({ to, subject, text, html }) {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback — print to terminal so you can read the OTP during development
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧  [DEV EMAIL — not sent]`);
    console.log(`To      : ${to}`);
    console.log(`Subject : ${subject}`);
    console.log(`Body    :\n${text}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  const from = process.env.SMTP_FROM || `"SuperMart" <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html });
    logger.info({ to, subject, messageId: info.messageId }, 'Email sent');
  } catch (err) {
    logger.error({ err, to, subject }, 'Email send failed');
    throw Object.assign(new Error('Failed to send email. Please try again.'), { statusCode: 500 });
  }
}

// ── Typed email helpers ───────────────────────────────────────────────────────

export async function sendPasswordResetEmail(email, code) {
  await sendEmail({
    to: email,
    subject: 'SuperMart — Password Reset OTP',
    text: `Your OTP to reset your SuperMart password is:\n\n  ${code}\n\nThis OTP expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n— SuperMart Team`,
    html: emailTemplate({
      title: 'Reset Your Password',
      body: `<p>Use the OTP below to reset your SuperMart password.</p>`,
      otp: code,
      note: 'This OTP expires in <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.',
    }),
  });
}

export async function sendEmailVerificationEmail(email, code) {
  await sendEmail({
    to: email,
    subject: 'SuperMart — Verify Your Email',
    text: `Welcome to SuperMart! 🛒\n\nYour email verification OTP is:\n\n  ${code}\n\nEnter this code to complete your account registration.\nThis OTP expires in 10 minutes.\n\nIf you did not create an account, please ignore this email.\n\n— SuperMart Team`,
    html: emailTemplate({
      title: 'Verify Your Email',
      body: `<p>Welcome to <strong>SuperMart</strong>! Use the OTP below to verify your email and complete registration.</p>`,
      otp: code,
      note: 'This OTP expires in <strong>10 minutes</strong>. If you did not sign up, you can safely ignore this email.',
    }),
  });
}

// ── Minimal branded HTML template ─────────────────────────────────────────────

function emailTemplate({ title, body, otp, note }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#16a34a;padding:24px 32px;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
              Super<span style="color:#bbf7d0;">Mart</span>
            </p>
            <p style="margin:4px 0 0;font-size:11px;color:#bbf7d0;letter-spacing:2px;text-transform:uppercase;">
              ready in 2 hrs
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">${title}</h2>
            <div style="font-size:14px;color:#6b7280;line-height:1.6;">${body}</div>

            <!-- OTP box -->
            <div style="margin:24px 0;text-align:center;background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:20px;">
              <p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Your OTP</p>
              <p style="margin:0;font-size:40px;font-weight:900;color:#16a34a;letter-spacing:12px;font-family:monospace;">${otp}</p>
            </div>

            <p style="font-size:12px;color:#9ca3af;line-height:1.5;">${note}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              © ${new Date().getFullYear()} SuperMart, Surat, Gujarat, India
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
