// src/routes/aiRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { speechToText, generateMail } from "../controllers/aiController.js";
import verifyToken from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   📂 Resolve __dirname (ESM)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   📂 Ensure uploads folder exists
========================= */
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   📂 Multer Setup for Audio
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio files are allowed"));
    }
    cb(null, true);
  },
});

/* =========================
   ⚙️ Async Wrapper
========================= */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* =========================
   🎙 Speech-to-Text
   POST /api/ai/stt
========================= */
router.post(
  "/stt",
  verifyToken,
  upload.single("audio"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No audio file uploaded" });
    }

    const text = await speechToText(req.file.filename);

    res.json({ success: true, text });
  })
);

/* =========================
   🤖 Generate Mail
   POST /api/ai/generate
========================= */
router.post(
  "/generate",
  verifyToken,
  asyncHandler(async (req, res) => {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    try {
      const { subject, body } = await generateMail(prompt);

      res.json({
        success: true,
        subject,
        body,
      });
    } catch (err) {
      console.error("AI Generate Error:", err);
      res.status(500).json({ success: false, message: "Mail generation failed" });
    }
  })
);

/* =========================
   ❌ Error Handling Middleware
========================= */
router.use((err, req, res, next) => {
  console.error("AI Route Error:", err.message || err);
  res.status(500).json({ success: false, message: err.message || "Server error" });
});

export default router;
