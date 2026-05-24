const express = require('express');
const bcrypt = require('bcryptjs');
const { createUser, findByEmail } = require('../repositories/userRepository');
const { generateToken, sanitizeUser } = require('../utils/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = await findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Account already exists for this email.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await createUser({ name, email, passwordHash });
  const token = generateToken(created);

  return res.status(201).json({
    token,
    user: sanitizeUser(created),
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await findByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = generateToken(user);
  return res.json({
    token,
    user: sanitizeUser(user),
  });
});

module.exports = router;
