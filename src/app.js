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

dotenv.config();

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));


// Error handling and cleanup middleware
app.use(cleanupTemp);

const port = process.env.PORT || 5500;

app.get("/", (req, res) => {
  res.status(200).json({message: "Server Working"});
});

app.use("/user", routerUser);
app.use("/item", routerItem);  // Add the item routes to the application
app.use("/claim", routerClaim);

app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  await connectDb();
});