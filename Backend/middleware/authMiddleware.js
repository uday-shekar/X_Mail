import jwt from "jsonwebtoken";
import User from "../models/User.js";

// 🔹 Middleware: Verify access token, fallback to refresh token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET); // access token
    } catch (err) {
      // If access token invalid, check if refresh token is provided
      const refreshToken = req.headers["x-refresh-token"];
      if (!refreshToken) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
      }

      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, { ignoreExpiration: true });
        // Optionally, issue a new access token here if needed
      } catch (err) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid refresh token" });
      }
    }

    // 🔍 Fetch user using _id or userId
    let user;
    if (decoded._id) {
      user = await User.findById(decoded._id).select("-password");
    } else if (decoded.userId) {
      user = await User.findOne({ userId: decoded.userId }).select("-password");
    } else {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid token payload" });
    }

    if (!user) return res.status(401).json({ success: false, message: "Unauthorized: User not found" });

    req.user = { id: user._id, userId: user.userId, name: user.name };
    next();
  } catch (err) {
    console.error("❌ verifyToken Error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export default verifyToken;
