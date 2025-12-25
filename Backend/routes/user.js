import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import User from "../models/User.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =============================
   🔐 AUTH MIDDLEWARE
============================= */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ success: false, message: "No token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

/* =============================
   📂 MULTER STORAGE
============================= */
const uploadDir = path.join(process.cwd(), "uploads/profilePics");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) =>
    cb(
      null,
      `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}${path.extname(file.originalname)}`
    ),
});

const upload = multer({ storage });

/* =============================
   👤 GET LOGGED IN USER
============================= */
router.get("/me", authMiddleware, async (req, res) => {
  const user = await User.findOne({ userId: req.user.userId });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      userId: user.userId,
      username: user.username,
      profilePic: user.profilePic
        ? `${process.env.BACKEND_URL}${user.profilePic}`
        : null,
    },
  });
});

/* =============================
   🖼 UPDATE PROFILE PIC
============================= */
router.post(
  "/profile/pic",
  authMiddleware,
  upload.single("profilePic"),
  async (req, res) => {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.profilePic) {
      const oldPath = path.join(process.cwd(), user.profilePic);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.profilePic = `/uploads/profilePics/${req.file.filename}`;
    await user.save();

    res.json({
      success: true,
      profilePic: `${process.env.BACKEND_URL}${user.profilePic}`,
    });
  }
);

/* =============================
   ✏️ UPDATE USERNAME
============================= */
router.put("/profile/username", authMiddleware, async (req, res) => {
  const { username } = req.body;
  if (!username?.trim())
    return res
      .status(400)
      .json({ success: false, message: "Username required" });

  const user = await User.findOne({ userId: req.user.userId });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  user.username = username.trim();
  await user.save();

  res.json({ success: true, username: user.username });
});

/* =============================
   🔑 UPDATE PASSWORD (🔥 FIXED)
============================= */
router.put("/profile/password", authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return res
      .status(400)
      .json({ success: false, message: "Both passwords required" });

  const user = await User.findOne({ userId: req.user.userId });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch)
    return res
      .status(400)
      .json({ success: false, message: "Old password incorrect" });

  // ❗ DO NOT HASH HERE
  user.password = newPassword;
  await user.save(); // model pre-save will hash

  res.json({
    success: true,
    message: "Password updated successfully",
  });
});

export default router;
