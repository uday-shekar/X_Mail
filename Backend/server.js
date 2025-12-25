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
   🧠 DEBUG (TEMP – REMOVE LATER)
===================== */
console.log("🔑 GAMINI_API_KEY loaded:", !!process.env.OPENAI_API_KEY);
console.log("🔑 ASSEMBLYAI_API_KEY loaded:", !!process.env.ASSEMBLYAI_API_KEY);

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
   🌐 Allowed Frontend Origins
===================== */
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://2gzlmz21-5173.inc1.devtunnels.ms",
    ];

/* =====================
   🧩 Middlewares
===================== */
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }

      console.warn("❌ CORS blocked origin:", origin);
      return callback(new Error("CORS policy: Origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =====================
   📂 Static uploads
===================== */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =====================
   🛣 Routes
===================== */
app.use("/api/auth", authRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/user", userRoutes);
app.use("/api/drafts", draftRoutes);

app.get("/", (req, res) => {
  res.status(200).send("✅ Xmail backend running with OpenAI + AssemblyAI");
});

/* =====================
   🔌 SOCKET.IO
===================== */
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

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

    console.log(`✅ User registered: ${userId} -> ${socket.id}`);
  });

  socket.on("disconnect", () => {
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        console.log(`❌ User ${uid} disconnected`);
        break;
      }
    }
  });

  socket.on("error", (err) => {
    console.warn("⚠️ Socket error:", err?.message || err);
  });
});

/* =====================
   ▶️ Start Server
===================== */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`🌐 Allowed Origins: ${allowedOrigins.join(", ")}`);
    });
  } catch (err) {
    console.error("❌ Error starting server:", err);
    process.exit(1);
  }
};

/* =====================
   🧯 Global Error Handling
===================== */
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

startServer();

export { io, onlineUsers };
