import cors from "cors";
import express from "express";

import env from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import redirectRoutes from "./routes/redirectRoutes.js";
import urlRoutes from "./routes/urlRoutes.js";

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());

app.use("/api/urls", urlRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/health", healthRoutes);

// Must stay last: it matches any single-segment path as a short code.
app.use("/", redirectRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;