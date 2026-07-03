import jwt from 'jsonwebtoken';
import { extractClerkProfile, verifyClerkToken } from '../utils/clerk.js';
import { createUser, findByClerkId, findByEmail, updateByclerkId, updateById } from '../repositories/userRepository.js';

function looksLikeJwt(token: string): boolean {
  return token.split('.').length === 3;
}

async function resolveUserFromClerk(payload: any) {
  console.log("JWT PAYLOAD");
console.dir(payload, { depth: null });
  const profile = extractClerkProfile(payload);

  if (!profile?.clerkId) {
    throw new Error('Missing Clerk subject.');
  }

  // 1. Try find by Clerk ID (PRIMARY)
  let user = await findByClerkId(profile.clerkId);

  // 3. If still no user → create new one
  if (!user) {
    user = await createUser({
      clerkId: profile.clerkId,
      name: profile.name ?? 'User',
      email: profile.email ?? `user_${profile.clerkId}@clerk.local`,
    });

    return user;
  }

  // 4. Sync updates (keep DB fresh)

  const updates: any = {};

  if (profile.email && user.email !== profile.email) {
    updates.email = profile.email;
  }

  if (Object.keys(updates).length > 0) {
    user = await updateByclerkId(profile.clerkId, updates);
  }


  return user;
}

async function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token.' });
  }

  try {
    if (looksLikeJwt(token)) {
      try {
        const payload = await verifyClerkToken(token);
        const user = await resolveUserFromClerk(payload);
        req.user = user;
        req.auth = { clerkId: payload.sub };
        return next();
      } catch (clerkError) {
        // Fall through to local JWT verification.
      }
    }

    const secret = process.env.JWT_SECRET || 'dev_secret_for_fallback';
    const payload = jwt.verify(token, secret);
    //const user = await findByClerkId(payload.sub);

    /*if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = user;*/
    req.auth = { userId: payload.sub };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export default authMiddleware;
