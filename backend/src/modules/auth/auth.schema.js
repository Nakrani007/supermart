import { z } from 'zod';

const mobileSchema = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

const addressSchema = z.object({
  label:    z.enum(['Home', 'Office', 'Other']).default('Home'),
  line1:    z.string().min(5, 'Address too short'),
  line2:    z.string().optional(),
  city:     z.string().min(2),
  pincode:  z.string().regex(/^\d{6}$/, 'Invalid 6-digit pincode'),
  landmark: z.string().optional(),
}).optional();

// ─── OTP Login ───────────────────────────────────────────────────────────────
export const SendOTPSchema = z.object({ mobile: mobileSchema });

export const VerifyOTPSchema = z.object({
  mobile: mobileSchema,
  code:   z.string().length(6).regex(/^\d+$/),
  name:   z.string().min(2).max(60).optional(),
});

// ─── Registration ─────────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  name:            z.string().min(2, 'Name must be at least 2 characters').max(60),
  mobile:          mobileSchema,
  email:           z.string().email('Enter a valid email address'),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  address:         addressSchema,
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ─── Email+Password Login ─────────────────────────────────────────────────────
export const LoginSchema = z.object({
  mobile:   mobileSchema.optional(),
  email:    z.string().email().optional(),
  password: z.string().min(1),
}).refine((d) => d.mobile || d.email, { message: 'Provide mobile or email' });

// ─── Forgot / Reset Password ──────────────────────────────────────────────────
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Enter your registered email address'),
});

export const ResetPasswordSchema = z.object({
  email:           z.string().email(),
  code:            z.string().length(6).regex(/^\d+$/),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ─── Email Verification OTP ───────────────────────────────────────────────────
export const VerifyEmailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  code:  z.string().length(6).regex(/^\d+$/, 'OTP must be 6 digits'),
});

export const ResendEmailVerifySchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

// ─── Address CRUD ─────────────────────────────────────────────────────────────
export const AddressSchema = z.object({
  label:    z.enum(['Home', 'Office', 'Other']).default('Home'),
  line1:    z.string().min(5),
  line2:    z.string().optional(),
  city:     z.string().min(2),
  pincode:  z.string().regex(/^\d{6}$/),
  landmark: z.string().optional(),
  isDefault: z.boolean().optional(),
  // Optional GPS pin — stored to show delivery zone status on the address card
  lat:      z.number().min(-90).max(90).optional(),
  lng:      z.number().min(-180).max(180).optional(),
});

// ─── Update Profile ───────────────────────────────────────────────────────────
export const UpdateProfileSchema = z.object({
  name:  z.string().min(2).max(60).optional(),
  email: z.string().email().optional(),
});
