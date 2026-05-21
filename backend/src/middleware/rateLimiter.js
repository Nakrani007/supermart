import rateLimit from 'express-rate-limit';

// Global API limiter — catches misconfigured clients
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down' },
});

// Strict limiter for OTP endpoint — prevents SMS bombing (expensive + abuse)
export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,                     // 3 OTP requests per 10 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'OTP limit reached. Try again after 10 minutes.' },
});

// Tighter limit for order creation — prevents runaway automation
export const orderRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many orders in a short time' },
});
