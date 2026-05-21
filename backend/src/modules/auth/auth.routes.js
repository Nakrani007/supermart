import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { otpRateLimiter } from '../../middleware/rateLimiter.js';
import {
  SendOTPSchema, VerifyOTPSchema, RegisterSchema, LoginSchema,
  ForgotPasswordSchema, ResetPasswordSchema, AddressSchema, UpdateProfileSchema,
  VerifyEmailSchema, ResendEmailVerifySchema,
} from './auth.schema.js';
import * as ctrl from './auth.controller.js';

export const authRouter = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
authRouter.post('/otp/send',          otpRateLimiter, validate(SendOTPSchema),          ctrl.sendOTP);
authRouter.post('/otp/verify',                        validate(VerifyOTPSchema),         ctrl.verifyOTP);
authRouter.post('/register',                          validate(RegisterSchema),           ctrl.register);
authRouter.post('/login',                             validate(LoginSchema),              ctrl.login);
authRouter.post('/forgot-password',   otpRateLimiter, validate(ForgotPasswordSchema),    ctrl.forgotPassword);
authRouter.post('/reset-password',                    validate(ResetPasswordSchema),      ctrl.resetPassword);
authRouter.post('/verify-email',                      validate(VerifyEmailSchema),         ctrl.verifyEmailOTP);
authRouter.post('/resend-verify-email', otpRateLimiter, validate(ResendEmailVerifySchema), ctrl.resendEmailVerify);

// ─── Protected ────────────────────────────────────────────────────────────────
authRouter.get('/me',                 requireAuth,                                        ctrl.getProfile);
authRouter.patch('/me',               requireAuth, validate(UpdateProfileSchema),         ctrl.updateProfile);
authRouter.delete('/me',              requireAuth,                                        ctrl.deleteAccount);

// Address book
authRouter.post('/addresses',         requireAuth, validate(AddressSchema),               ctrl.addAddress);
authRouter.patch('/addresses/:id',    requireAuth, validate(AddressSchema.partial()),     ctrl.updateAddress);
authRouter.delete('/addresses/:id',   requireAuth,                                        ctrl.deleteAddress);
