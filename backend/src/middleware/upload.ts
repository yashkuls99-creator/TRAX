import path from "path";
import crypto from "crypto";
import multer from "multer";
import { env } from "../config/env";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

export function generateObjectKey(originalName: string): string {
  const unique = crypto.randomBytes(16).toString("hex");
  const ext = path.extname(originalName).toLowerCase();
  return `claims/${Date.now()}-${unique}${ext}`;
}

export const uploadBillFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only JPG, PNG, and PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
});
