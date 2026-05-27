const { createRemoteJWKSet, jwtVerify } = require('jose');

const PUBLISHABLE_KEY_PREFIXES = ['pk_test_', 'pk_live_'];

let cachedIssuer = null;
let cachedJwks = null;

function decodePublishableKey(key) {
  if (!key) {
    return null;
  }

  const prefix = PUBLISHABLE_KEY_PREFIXES.find((candidate) => key.startsWith(candidate));
  if (!prefix) {
    return null;
  }

  const encoded = key.slice(prefix.length);
  if (!encoded) {
    return null;
  }

  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  try {
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return decoded.replace(/\$/g, '');
  } catch (error) {
    return null;
  }
}

function resolveClerkIssuer() {
  const explicitIssuer = process.env.CLERK_ISSUER || process.env.CLERK_JWT_ISSUER;
  if (explicitIssuer) {
    return explicitIssuer.replace(/\/$/, '');
  }

  const frontendApi =
    process.env.CLERK_FRONTEND_API ||
    decodePublishableKey(
      process.env.CLERK_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
    );

  if (!frontendApi) {
    return null;
  }

  if (frontendApi.startsWith('http')) {
    return frontendApi.replace(/\/$/, '');
  }

  return `https://${frontendApi}`;
}

function getClerkIssuer() {
  if (!cachedIssuer) {
    cachedIssuer = resolveClerkIssuer();
  }

  return cachedIssuer;
}

function getClerkJwks(issuer) {
  if (!issuer) {
    return null;
  }

  if (!cachedJwks || cachedJwks.issuer !== issuer) {
    cachedJwks = {
      issuer,
      jwks: createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)),
    };
  }

  return cachedJwks.jwks;
}

async function verifyClerkToken(token) {
  const issuer = getClerkIssuer();
  if (!issuer) {
    throw new Error('Clerk issuer is not configured.');
  }

  const jwks = getClerkJwks(issuer);
  if (!jwks) {
    throw new Error('Clerk JWKS could not be resolved.');
  }

  const { payload } = await jwtVerify(token, jwks, { issuer });
  return payload;
}

function extractClerkProfile(payload) {
  if (!payload) {
    return null;
  }

  const email =
    payload.email ||
    payload.email_address ||
    payload.primary_email_address ||
    payload.primaryEmailAddress ||
    payload.emailAddress ||
    null;

  const name =
    payload.name ||
    [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
    payload.username ||
    (email ? email.split('@')[0] : null) ||
    'FinGekko User';

  return {
    clerkId: payload.sub,
    email,
    name,
  };
}

module.exports = {
  decodePublishableKey,
  getClerkIssuer,
  verifyClerkToken,
  extractClerkProfile,
};
