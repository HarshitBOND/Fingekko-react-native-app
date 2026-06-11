const jwt = require('jsonwebtoken');
const { extractClerkProfile, verifyClerkToken } = require('../utils/clerk');
const { createUser, findByClerkId, findByEmail, findById, updateById } = require('../repositories/userRepository');

function looksLikeJwt(token) {
  return token.split('.').length === 3;
}

async function resolveUserFromClerk(payload) {
  const profile = extractClerkProfile(payload);
  if (!profile || !profile.clerkId) {
    throw new Error('Missing Clerk subject.');
  }

  let user = await findByClerkId(profile.clerkId);
  if (!user && profile.email) {
    const byEmail = await findByEmail(profile.email);
    if (byEmail) {
      user = await updateById(byEmail.id ?? byEmail._id, {
        clerkId: profile.clerkId,
        name: profile.name || byEmail.name,
        email: profile.email || byEmail.email,
      });
    }
  }

  if (!user) {
    const fallbackEmail = profile.email || `user_${profile.clerkId}@clerk.local`;
    user = await createUser({
      clerkId: profile.clerkId,
      name: profile.name,
      email: fallbackEmail,
    });
  } else {
    const updates = {};
    if (!user.clerkId) {
      updates.clerkId = profile.clerkId;
    }
    if (profile.email && user.email !== profile.email) {
      updates.email = profile.email;
    }
    if (profile.name && user.name !== profile.name) {
      updates.name = profile.name;
    }
    if (Object.keys(updates).length > 0) {
      user = await updateById(user.id ?? user._id, updates);
    }
  }

  return user;
}

async function authMiddleware(req, res, next) {
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
    const user = await findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = user;
    req.auth = { userId: payload.sub };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
