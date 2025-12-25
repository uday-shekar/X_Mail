import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* ------------------------------------------
   TOKEN GENERATOR (No expiry)
------------------------------------------- */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.userId, _id: user._id },
    process.env.JWT_SECRET
  );

  const refreshToken = jwt.sign(
    { userId: user.userId, _id: user._id },
    process.env.JWT_REFRESH_SECRET
  );

  return { accessToken, refreshToken };
};

/* ------------------------------------------
   FORMAT USER RESPONSE (VERY IMPORTANT)
------------------------------------------- */
const formatUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    userId: user.userId,
    profilePic: user.profilePic
      ? `${process.env.BACKEND_URL}${user.profilePic}`
      : null,
  };
};

/* ------------------------------------------
   REGISTER
------------------------------------------- */
export const registerUser = async (req, res) => {
  const { name, userId, password } = req.body;

  if (!name || !userId || !password) {
    return res
      .status(400)
      .json({ success: false, message: "All fields required" });
  }

  if (!userId.endsWith("@xmail.com")) {
    return res.status(400).json({
      success: false,
      message: "User ID must end with @xmail.com",
    });
  }

  try {
    // Normalize userId to lowercase and trim (matching schema behavior)
    const normalizedUserId = userId.toLowerCase().trim();
    
    const existingUser = await User.findOne({ userId: normalizedUserId });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    // Pass plain password - the User model's pre-save hook will hash it
    const user = await User.create({
      name,
      userId: normalizedUserId,
      password, // Plain password - will be hashed by pre-save hook
      profilePic: null, // default dp
    });

    const { accessToken, refreshToken } = generateTokens(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: formatUser(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Register Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Registration failed" });
  }
};

/* ------------------------------------------
   LOGIN (FIXED DP ISSUE)
------------------------------------------- */
export const loginUser = async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({
      success: false,
      message: "User ID and password required",
    });
  }

  try {
    // Normalize userId to lowercase and trim (matching schema behavior)
    const normalizedUserId = userId.toLowerCase().trim();
    const user = await User.findOne({ userId: normalizedUserId });
    
    if (!user) {
      console.log(`Login failed: User not found for userId: ${normalizedUserId}`);
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Login failed: Password mismatch for userId: ${normalizedUserId}`);
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    return res.json({
      success: true,
      message: "Login successful",
      user: formatUser(user), // 🔥 sends FULL PROFILE DATA
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};

/* ------------------------------------------
   REFRESH TOKEN
------------------------------------------- */
export const refreshAccessToken = (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken)
    return res
      .status(401)
      .json({ success: false, message: "Refresh token required" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      ignoreExpiration: true,
    });

    const accessToken = jwt.sign(
      { userId: decoded.userId, _id: decoded._id },
      process.env.JWT_SECRET
    );

    return res.json({ success: true, accessToken });
  } catch (err) {
    console.error("Refresh Error:", err);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

/* ------------------------------------------
   AUTO LOGIN
------------------------------------------- */
export const autoLogin = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findOne({ userId: req.user.userId });

    return res.json({
      success: true,
      message: "Auto login successful",
      user: formatUser(user),
    });
  } catch (err) {
    console.error("AutoLogin Error:", err);
    return res.status(500).json({ success: false, message: "Auto login failed" });
  }
};
