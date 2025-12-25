import express from "express";
import path from "path";
import multer from "multer";
import verifyToken from "../middleware/authMiddleware.js";

// 📌 Import mail controllers
import {
  composeMail,
  replyMail,
  getInbox,
  getSent,
  getDeleted,
  getSaved,
  getDrafts,
  deleteMail,
  saveMail,
  restoreMail,
  saveDraft,
  toggleStar,
  searchMail,
  downloadAttachment,
  smartCompose,
  voiceMail,
  getNewMailCount,
  markMailAsRead,
  updateUsername,
  updatePassword,
} from "../controllers/mailController.js";

/* ============================================
   📁 Multer Storage
============================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ storage });

/* ============================================
   ⚙️ Async Wrapper
============================================ */
const asyncHandler =
  (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/* ============================================
   🚀 Router
============================================ */
const router = express.Router();

/* ============================================
   ✉️ Mail Actions
============================================ */
router.post(
  "/compose",
  verifyToken,
  upload.array("attachments", 5),
  asyncHandler(composeMail)
);

router.post(
  "/reply/:mailId",
  verifyToken,
  upload.array("attachments", 5),
  asyncHandler(replyMail)
);

/* ============================================
   📥 Mail Folders
   ⚠️ Fixed: Added /home prefix for frontend compatibility
============================================ */
router.get("/home/inbox", verifyToken, asyncHandler(getInbox));
router.get("/home/sent", verifyToken, asyncHandler(getSent));
router.get("/home/deleted", verifyToken, asyncHandler(getDeleted));
router.get("/home/saved", verifyToken, asyncHandler(getSaved));
router.get("/home/drafts", verifyToken, asyncHandler(getDrafts));

/* ============================================
   🛠 Mail Controls
============================================ */
router.put("/trash/:mailId", verifyToken, asyncHandler(deleteMail));
router.put("/save/:mailId", verifyToken, asyncHandler(saveMail));
router.put("/restore/:mailId", verifyToken, asyncHandler(restoreMail));
router.put("/star/:mailId", verifyToken, asyncHandler(toggleStar));
router.put("/read/:mailId", verifyToken, asyncHandler(markMailAsRead));

/* ============================================
   ✍️ Draft
============================================ */
router.post("/draft", verifyToken, asyncHandler(saveDraft));

/* ============================================
   🔍 Search
============================================ */
router.get("/search", verifyToken, asyncHandler(searchMail));

/* ============================================
   📎 Attachments
============================================ */
router.post(
  "/upload",
  verifyToken,
  upload.single("file"),
  asyncHandler((req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    res.json({
      success: true,
      fileUrl: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
    });
  })
);

router.get(
  "/download/:filename",
  verifyToken,
  asyncHandler(downloadAttachment)
);

/* ============================================
   🤖 Smart Compose
============================================ */
router.post("/smart-compose", verifyToken, asyncHandler(smartCompose));

/* ============================================
   🎙 Voice Mail
============================================ */
router.post(
  "/voicemail",
  verifyToken,
  upload.single("audio"),
  asyncHandler(voiceMail)
);

/* ============================================
   🔔 Notifications
============================================ */
router.get("/new-count", verifyToken, asyncHandler(getNewMailCount));

/* ============================================
   👤 USER PROFILE SETTINGS
============================================ */
router.put(
  "/profile/username",
  verifyToken,
  asyncHandler(updateUsername)
);

router.put(
  "/profile/password",
  verifyToken,
  asyncHandler(updatePassword)
);

export default router;
