import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db.js';
import { cache, CACHE_TTL } from '../../config/redis.js';
import { generateOTP, sendOTP } from '../../utils/otp.js';
import { sendPasswordResetEmail, sendEmailVerificationEmail } from '../../utils/email.js';
import { signToken } from '../../utils/jwt.js';
import { logger } from '../../utils/logger.js';

// ─── OTP Login Flow ───────────────────────────────────────────────────────────

export async function sendOTPService(mobile) {
  await prisma.oTP.updateMany({
    where: { mobile, type: 'LOGIN', used: false },
    data: { used: true },
  });

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + CACHE_TTL.OTP * 1000);

  await prisma.oTP.create({ data: { mobile, code, type: 'LOGIN', expiresAt } });
  await cache.setex(`otp:login:${mobile}`, CACHE_TTL.OTP, code);
  await sendOTP(mobile, code);
  logger.info({ mobile }, 'Login OTP sent');
}

export async function verifyOTPService(mobile, code, name) {
  await verifyCode({ key: `otp:login:${mobile}`, mobile, code, type: 'LOGIN' });

  const user = await prisma.user.upsert({
    where: { mobile },
    create: { mobile, name: name || null, isVerified: true },
    update: { isVerified: true, ...(name && { name }) },
  });

  return { token: signToken({ id: user.id, mobile: user.mobile }), user: sanitize(user) };
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerService({ name, mobile, email, password, address }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ mobile }, { email }] },
  });
  if (existing) {
    const field = existing.mobile === mobile ? 'Mobile number' : 'Email';
    throw err(`${field} is already registered. Please login instead.`, 409);
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      mobile,
      email,
      password: hashed,
      isVerified: false,
      // Create default address if provided during registration
      addresses: address
        ? { create: { ...address, isDefault: true } }
        : undefined,
    },
    include: { addresses: true },
  });

  // Send OTP to EMAIL for verification
  await sendEmailVerificationOTPService(email);
  logger.info({ userId: user.id }, 'User registered — email verification OTP sent');

  return { user: sanitize(user), otpSent: true };
}

// ─── Email + Password Login ───────────────────────────────────────────────────

export async function loginService({ mobile, email, password }) {
  const user = await prisma.user.findFirst({
    where: mobile ? { mobile } : { email },
  });

  if (!user || !user.password) {
    throw err('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw err('Invalid credentials', 401);

  return { token: signToken({ id: user.id, mobile: user.mobile }), user: sanitize(user) };
}

// ─── Forgot Password (sends OTP to registered email) ─────────────────────────

export async function forgotPasswordService(email) {
  // Don't reveal whether the email exists — always return success
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silent — prevents email enumeration

  await prisma.oTP.updateMany({
    where: { email, type: 'PASSWORD_RESET', used: false },
    data: { used: true },
  });

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + CACHE_TTL.OTP * 1000);

  await prisma.oTP.create({ data: { email, code, type: 'PASSWORD_RESET', expiresAt } });
  await cache.setex(`otp:reset:${email}`, CACHE_TTL.OTP, code);
  await sendPasswordResetEmail(email, code);
  logger.info({ email }, 'Password reset OTP sent');
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPasswordService(email, code, newPassword) {
  await verifyCode({ key: `otp:reset:${email}`, email, code, type: 'PASSWORD_RESET' });

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: { password: hashed },
  });

  logger.info({ email }, 'Password reset successful');
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfileService(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, mobile: true, email: true,
      isVerified: true, createdAt: true,
      addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
    },
  });
  if (!user) throw err('User not found', 404);
  return user;
}

export async function updateProfileService(userId, { name, email }) {
  if (email) {
    const conflict = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
    });
    if (conflict) throw err('Email already in use', 409);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...(name && { name }), ...(email && { email }) },
    select: { id: true, name: true, mobile: true, email: true, isVerified: true },
  });
  return user;
}

// ─── Address CRUD ─────────────────────────────────────────────────────────────

export async function addAddressService(userId, data) {
  // If this is set as default, unset all others first
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  // First address is always default
  const count = await prisma.address.count({ where: { userId } });
  return prisma.address.create({
    data: { ...data, userId, isDefault: count === 0 ? true : (data.isDefault ?? false) },
  });
}

export async function updateAddressService(userId, addressId, data) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw err('Address not found', 404);

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  return prisma.address.update({ where: { id: addressId }, data });
}

export async function deleteAddressService(userId, addressId) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw err('Address not found', 404);
  await prisma.address.delete({ where: { id: addressId } });

  // If deleted address was default, make the next one default
  if (address.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
}

// ─── Email Verification OTP ───────────────────────────────────────────────────

export async function sendEmailVerificationOTPService(email) {
  // Invalidate any outstanding unused OTPs for this email
  await prisma.oTP.updateMany({
    where: { email, type: 'EMAIL_VERIFY', used: false },
    data: { used: true },
  });

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + CACHE_TTL.OTP * 1000);

  await prisma.oTP.create({ data: { email, code, type: 'EMAIL_VERIFY', expiresAt } });
  await cache.setex(`otp:email_verify:${email}`, CACHE_TTL.OTP, code);
  await sendEmailVerificationEmail(email, code);
  logger.info({ email }, 'Email verification OTP sent');
}

export async function verifyEmailOTPService(email, code) {
  // Validate the OTP
  await verifyCode({ key: `otp:email_verify:${email}`, email, code, type: 'EMAIL_VERIFY' });

  // Mark user as verified
  const user = await prisma.user.update({
    where: { email },
    data: { isVerified: true },
    select: {
      id: true, name: true, mobile: true, email: true,
      isVerified: true, createdAt: true,
      addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
    },
  });

  logger.info({ email }, 'Email verified successfully');
  return { token: signToken({ id: user.id, mobile: user.mobile }), user };
}

// ─── Delete Account ───────────────────────────────────────────────────────────

export async function deleteAccountService(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw err('User not found', 404);

  // Hard-delete in order: OTPs → Addresses → User
  // (Orders are kept for audit trail but unlinked by nullifying userId if schema allows,
  //  otherwise just delete the user and rely on DB cascade or leave orphaned orders)
  await prisma.$transaction([
    prisma.oTP.deleteMany({
      where: {
        OR: [
          { mobile: user.mobile },
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
    }),
    prisma.address.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  logger.info({ userId }, 'User account deleted');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function verifyCode({ key, mobile, email, code, type }) {
  const cached = await cache.get(key);

  if (cached) {
    if (cached !== code) throw err('Invalid OTP', 400);
    await cache.del(key);
    await prisma.oTP.updateMany({
      where: { ...(mobile ? { mobile } : { email }), code, type, used: false },
      data: { used: true },
    });
  } else {
    const record = await prisma.oTP.findFirst({
      where: {
        ...(mobile ? { mobile } : { email }),
        code, type, used: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) throw err('OTP expired or invalid. Request a new one.', 400);
    await prisma.oTP.update({ where: { id: record.id }, data: { used: true } });
  }
}

function sanitize(user) {
  const { password, ...safe } = user;
  return safe;
}

function err(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}
