import * as authService from './auth.service.js';

export async function sendOTP(req, res, next) {
  try {
    await authService.sendOTPService(req.body.mobile);
    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) { next(err); }
}

export async function verifyOTP(req, res, next) {
  try {
    const { mobile, code, name } = req.body;
    const result = await authService.verifyOTPService(mobile, code, name);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function register(req, res, next) {
  try {
    const result = await authService.registerService(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const result = await authService.loginService(req.body);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function forgotPassword(req, res, next) {
  try {
    await authService.forgotPasswordService(req.body.email);
    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'If this email is registered, an OTP has been sent.' });
  } catch (err) { next(err); }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, code, password } = req.body;
    await authService.resetPasswordService(email, code, password);
    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (err) { next(err); }
}

export async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfileService(req.user.id);
    res.json({ success: true, user });
  } catch (err) { next(err); }
}

export async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateProfileService(req.user.id, req.body);
    res.json({ success: true, user });
  } catch (err) { next(err); }
}

export async function addAddress(req, res, next) {
  try {
    const address = await authService.addAddressService(req.user.id, req.body);
    res.status(201).json({ success: true, address });
  } catch (err) { next(err); }
}

export async function updateAddress(req, res, next) {
  try {
    const address = await authService.updateAddressService(req.user.id, req.params.id, req.body);
    res.json({ success: true, address });
  } catch (err) { next(err); }
}

export async function deleteAddress(req, res, next) {
  try {
    await authService.deleteAddressService(req.user.id, req.params.id);
    res.json({ success: true, message: 'Address deleted' });
  } catch (err) { next(err); }
}

export async function deleteAccount(req, res, next) {
  try {
    await authService.deleteAccountService(req.user.id);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) { next(err); }
}

export async function verifyEmailOTP(req, res, next) {
  try {
    const { email, code } = req.body;
    const result = await authService.verifyEmailOTPService(email, code);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function resendEmailVerify(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    await authService.sendEmailVerificationOTPService(email);
    res.json({ success: true, message: 'Verification OTP resent to your email' });
  } catch (err) { next(err); }
}
