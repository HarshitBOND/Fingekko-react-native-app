require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { connectDb, getDbStatus } = require('./db');
const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');

const app = express();
const port = process.env.PORT || 4000;
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  return res.json({ status: 'ok', db: getDbStatus() });
});

app.use('/api/auth', authRoutes);
app.use('/api', homeRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ error: 'Unexpected server error.' });
});

connectDb()
  .then(() => {
    app.listen(port, () => {
      if (!process.env.JWT_SECRET) {
        console.warn('JWT_SECRET is not set. Using a dev fallback secret.');
      }
      if (!process.env.MONGODB_URI) {
        console.warn('MONGODB_URI is not set. Using in-memory data store.');
      }
      console.log(`API server listening on port ${port}.`);
    });
  })
  .catch((error) => {
    console.error('Unable to start API server:', error);
    process.exit(1);
  });
