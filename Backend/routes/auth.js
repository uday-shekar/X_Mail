// src/routes/authRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import { registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

// 🔐 Register Route
router.post("/register", registerUser);

// 🔐 Login Route
router.post("/login", loginUser);

// 🔄 Refresh Token Route (PERMANENT TOKEN SYSTEM)
router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Refresh token is required",
    });
  }

  try {
    // ⚡ Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      { ignoreExpiration: true } // since token is permanent
    );

    if (!decoded?.userId) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // 🔥 Generate new ACCESS TOKEN (PERMANENT)
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, _id: decoded._id },
      process.env.JWT_SECRET, // no expiresIn → permanent
    );

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });

  } catch (err) {
    console.error("Refresh Token Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh token",
    });
  }
});

export default router;
