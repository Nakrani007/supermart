import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  // Throws JsonWebTokenError or TokenExpiredError — caught by auth middleware
  return jwt.verify(token, SECRET);
}
