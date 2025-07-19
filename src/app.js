import express from "express";
import connectDb from "../config/db.js";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import routerUser from "../routes/userRoutes.js";
import routerItem from "../routes/itemRoutes.js";  // Import the new item routes
import { cleanupTemp } from "../middleware/cleanup.js"; // Import cleanup middleware
import routerClaim from "../routes/claimRoutes.js";
import routerVersion from "../routes/versionRoutes.js";
import rateLimit from "express-rate-limit";
import { apiKeyMiddleware } from "../middleware/apiKey.js";
import helmet from "helmet";

dotenv.config();

const app = express();

if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}
app.use(express.json());
app.use(helmet());

// GET routes: 60 requests per 15 minutes per IP
const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    message: "Too many GET requests from this IP, please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use((req, res, next) => {
  if (req.method === "GET") {
    return getLimiter(req, res, next);
  }
  next();
});

// POST /user/login: 30 requests per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    message: "Too many login attempts, please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/user/login", loginLimiter);

// Other POST routes: 5 requests per 15 minutes per IP
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many POST requests from this IP, please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use((req, res, next) => {
  if (req.method === "POST" && req.path !== "/user/login") {
    return postLimiter(req, res, next);
  }
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    // Block all browser-based requests
    return callback(new Error('Not allowed by CORS'));
  }
}));

// Use API Key validation middleware
app.use(apiKeyMiddleware);

// Error handling and cleanup middleware
app.use(cleanupTemp);

const port = process.env.PORT || 5500;

app.get("/", (req, res) => {
  res.status(200).json({message: "Server Working"});
});

app.use("/user", routerUser);
app.use("/item", routerItem);  // Add the item routes to the application
app.use("/claim", routerClaim);
app.use("/api", routerVersion);

app.listen(port, async () => {
  // Removed detailed log for security
  await connectDb();
});

// Global error handler (should be last)
app.use((err, req, res, next) => {
  // Optionally log a generic error message
  // console.error('An error occurred');
  console.error('Global error handler:', err);
  res.status(500).json({ message: 'An unexpected error occurred.' });
});