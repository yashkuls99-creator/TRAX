import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { env } from "../config/env";

const claimsDir = path.join(env.uploadDir, "claims");
if (!fs.existsSync(claimsDir)) {
  fs.mkdirSync(claimsDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, claimsDir),
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

export const uploadBillFiles = multer({
  storage,
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only JPG, PNG, and PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export { claimsDir };
