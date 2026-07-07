import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { connectDb, getDbStatus } from "./db.js";
import clerkWebhookRoutes from "./routes/clerkWebhook.js";
import expenseRoutes from "./routes/communityExpense.routes.js";
import friendRoutes from "./routes/friends.routes.js";
import goalRoutes from "./routes/goal.routes.js";
import groupRoutes from "./routes/group.routes.js";
import homeRoutes from "./routes/home.js";
import notificationRoutes from "./routes/notification.routes.js";

dotenv.config();


const app = express();
const port = Number(process.env.PORT) || 4000;
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;

function isLikelyOrigin(origin: string): boolean {
  return /^https?:\/\//i.test(origin);
}

const resolvedOrigins = corsOrigins ? corsOrigins.filter(isLikelyOrigin) : null;

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: resolvedOrigins && resolvedOrigins.length > 0 ? resolvedOrigins : true,
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(morgan('dev'));

app.use('/webhooks/clerk', express.raw({ type: 'application/json' }), clerkWebhookRoutes);
app.use(express.json({ limit: '1mb' }));


app.get('/health', (req: Request, res: Response) => {
  return res.json({ status: 'ok', db: getDbStatus() });
});

app.get("/", (req: Request,res: Response)=>{
  res.json({
    status:"ok",
    message : "Fingekko API is running"
  })
})


// app.use('/api/auth', authRoutes);
app.use('/api', homeRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/notifications", notificationRoutes);








app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  return res.status(500).json({ error: 'Unexpected server error.' });
});



connectDb()
  .then(() => {
    app.listen(port,() => {
      /*if (!process.env.JWT_SECRET) {
        console.warn('JWT_SECRET is not set. Using a dev fallback secret.');
      }*/
      if (!process.env.MONGODB_URI) {
        console.warn('MONGODB_URI is not set. Using in-memory data store.');
      }
      console.log(`API server listening on port ${port}.`);
    });
  })
  .catch((error: Error ) => {
    console.error('Unable to start API server:', error);
    process.exit(1);
  });



