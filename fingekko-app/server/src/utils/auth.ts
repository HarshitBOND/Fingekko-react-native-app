/*import jwt from "jsonwebtoken";

export function sanitizeUser(user: any) {
  if (!user) {
    return null;
  }

  const plain = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  const { passwordHash, __v, ...safe } = plain;

  if (safe._id && !safe.id) {
    safe.id = safe._id.toString();
    delete safe._id;
  }

  return safe;
}

export function generateToken(user: any){
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  const subject = user.id ?? user._id?.toString();
  const payload = {
    sub: subject,
    email: user.email,
  };

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}*/