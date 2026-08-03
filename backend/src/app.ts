import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/users.routes";
import { projectRouter } from "./routes/projects.routes";
import { categoryRouter } from "./routes/categories.routes";
import { claimRouter } from "./routes/claims.routes";
import { paymentRouter } from "./routes/payments.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { reportRouter } from "./routes/reports.routes";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan(env.isProduction ? "combined" : "dev"));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", generalLimiter);

app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/projects", projectRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/claims", claimRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportRouter);

app.use(notFoundHandler);
app.use(errorHandler);
