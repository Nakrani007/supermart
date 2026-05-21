// OTP generation and delivery.
// In dev: logs OTP to console (no SMS cost).
// In prod: integrate MSG91 (popular in India, ₹0.15/SMS) or Twilio.

import { logger } from './logger.js';

export function generateOTP() {
  // 6-digit numeric OTP — familiar format for Indian users
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendOTP(mobile, code) {
  if (process.env.NODE_ENV !== 'production' || process.env.SMS_PROVIDER === 'mock') {
    console.log(`\n📱 [DEV OTP] Mobile: ${mobile}  Code: ${code}\n`);
    return;
  }

  if (process.env.SMS_PROVIDER === 'msg91') {
    await sendViaMSG91(mobile, code);
  }
}

async function sendViaMSG91(mobile, code) {
  // MSG91 Flow API — replace FLOW_ID and AUTH_KEY in .env
  const res = await fetch('https://api.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: process.env.MSG91_AUTH_KEY,
    },
    body: JSON.stringify({
      flow_id: process.env.MSG91_FLOW_ID,
      sender: process.env.MSG91_SENDER_ID || 'SMMART',
      mobiles: `91${mobile}`,
      OTP: code,
    }),
  });
  if (!res.ok) {
    logger.error({ status: res.status }, 'MSG91 OTP delivery failed');
    throw new Error('SMS delivery failed');
  }
}
