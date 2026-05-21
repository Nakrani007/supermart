import client from './client.js';

export const authApi = {
  sendOTP:        (mobile) => client.post('/auth/otp/send', { mobile }),
  verifyOTP:      (mobile, code, name) => client.post('/auth/otp/verify', { mobile, code, name }),
  register:       (data) => client.post('/auth/register', data),
  login:          (data) => client.post('/auth/login', data),
  forgotPassword:      (email) => client.post('/auth/forgot-password', { email }),
  resetPassword:       (data) => client.post('/auth/reset-password', data),
  verifyEmailOTP:      (email, code) => client.post('/auth/verify-email', { email, code }),
  resendEmailVerify:   (email) => client.post('/auth/resend-verify-email', { email }),
  getProfile:     () => client.get('/auth/me'),
  updateProfile:  (data) => client.patch('/auth/me', data),
  addAddress:     (data) => client.post('/auth/addresses', data),
  updateAddress:  (id, data) => client.patch(`/auth/addresses/${id}`, data),
  deleteAddress:  (id) => client.delete(`/auth/addresses/${id}`),
  deleteAccount:  () => client.delete('/auth/me'),
};
