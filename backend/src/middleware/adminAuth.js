// Admin authentication middleware.
// Admin tokens carry { adminId, username, isAdmin: true } — verified against JWT_SECRET.

import { verifyToken } from '../utils/jwt.js';

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    if (!payload.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Admin session expired, please login again' : 'Invalid admin token';
    res.status(401).json({ success: false, message });
  }
}
