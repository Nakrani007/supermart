// JWT authentication middleware.
// Attaches req.user = { id, mobile } on success.

import { verifyToken } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Session expired, please login again' : 'Invalid token';
    res.status(401).json({ success: false, message });
  }
}

// POS terminals authenticate with a static API key, not JWT
export function requirePosKey(req, res, next) {
  const key = req.headers['x-pos-api-key'];
  if (!key || key !== process.env.POS_API_KEY) {
    return res.status(403).json({ success: false, message: 'Invalid POS API key' });
  }
  next();
}
