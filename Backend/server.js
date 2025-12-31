/* =====================
   🔑 ENV (MUST BE FIRST)
===================== */
import dotenv from "dotenv";
dotenv.config();

/* =====================
   📦 Core Imports
===================== */
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

/* =====================
   📦 App Imports
===================== */
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import mailRoutes from "./routes/mail.js";
import aiRoutes from "./routes/aiRoutes.js";
import botRoutes from "./routes/botRoutes.js";
import userRoutes from "./routes/user.js";
import draftRoutes from "./routes/draftRoutes.js";

/* =====================
   🧭 ES Module dirname fix
===================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =====================
   🚀 Express + HTTP
===================== */
const app = express();
const httpServer = createServer(app);

/* =====================
   🌐 Allowed Origins
===================== */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://x-mail-inqh.onrender.com",
];

/* =====================
   🧩 Middlewares
===================== */
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((o) => origin.startsWith(o)))
        return callback(null, true);
      return callback(new Error("❌ CORS not allowed"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =====================
   📂 Static uploads
===================== */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =====================
   🛣 API Routes (🔥 ALWAYS BEFORE SPA FALLBACK 🔥)
===================== */
app.use("/api/auth", authRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/user", userRoutes);
app.use("/api/drafts", draftRoutes);

/* =====================
   🔌 SOCKET.IO
===================== */
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("registerUser", (userId) => {
    if (!userId) return;

    if (onlineUsers.has(userId)) {
      const oldSocketId = onlineUsers.get(userId);
      if (oldSocketId !== socket.id) {
        io.sockets.sockets.get(oldSocketId)?.disconnect(true);
      }
    }

    onlineUsers.set(userId, socket.id);
    socket.join(userId);
  });

  socket.on("disconnect", () => {
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        break;
      }
    }
  });
});

/* =====================
   🌐 SERVE FRONTEND (🔥 CRITICAL FIX 🔥)
===================== */
const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendPath));

// SPA fallback - serve index.html for all non-API routes
app.get("*", (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});

/* =====================
   ▶️ Start Server
===================== */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server start failed:", err);
    process.exit(1);
  }
};

startServer();

export { io, onlineUsers };
