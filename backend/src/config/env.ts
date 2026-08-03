import dotenv from "dotenv";
import path from "path";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  jwtRefreshExpiresMs: 7 * 24 * 60 * 60 * 1000,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? "./uploads"),
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "10", 10),
  isProduction: (process.env.NODE_ENV ?? "development") === "production",
};
