// routes/botRoutes.js
import express from "express";
import { getBotSettings, saveBotSettings } from "../controllers/botController.js";
import verifyToken from "../middleware/authMiddleware.js";

const router = express.Router();

// GET settings by userId
router.get("/:userId", verifyToken, getBotSettings);

// POST save/update settings
router.post("/", verifyToken, saveBotSettings);

export default router;
