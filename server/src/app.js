import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { checkDatabaseConnection } from "./db/pool.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import authRoutes from "./auth/auth.routes.js";
import productRoutes from "./products/product.routes.js";
import userRoutes from "./users/user.routes.js";
import { asyncHandler } from "./utils/http-error.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  if (env.nodeEnv !== "test") app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  const healthPayload = () => ({
    success: true,
    status: "ok",
    service: "funbike-server",
    timestamp: new Date().toISOString(),
  });

  app.get("/health", (_request, response) => response.json(healthPayload()));
  app.get("/api/health", (_request, response) => response.json(healthPayload()));

  app.get(
    "/health/db",
    asyncHandler(async (_request, response) => {
      await checkDatabaseConnection();
      return response.json({ success: true, status: "ok", database: "connected" });
    }),
  );

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api", productRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
