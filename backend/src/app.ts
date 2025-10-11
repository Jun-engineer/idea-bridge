import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { appRouter } from "./routes/apps";
import { ideaRouter } from "./routes/ideas";
import { profileRouter } from "./routes/profiles";
import { authRouter } from "./routes/auth";
import { config } from "./config";
import { optionalAuth } from "./middleware/auth";

export function createApp() {
  const app = express();

  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(optionalAuth);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/ideas", ideaRouter);
  app.use("/api/apps", appRouter);
  app.use("/api/profiles", profileRouter);

  return app;
}

export type AppInstance = ReturnType<typeof createApp>;
