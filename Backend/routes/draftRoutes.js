import express from "express";
import Mail from "../models/Mail.js";
import verifyToken from "../middleware/authMiddleware.js";

const router = express.Router();

/* =====================================================
   1️⃣ CREATE DRAFT (Auto-save first time)
===================================================== */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { to = "", subject = "", body = "", attachments = [] } = req.body;

    // ✅ SAFETY CHECK
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ PREVENT EMPTY DRAFT FLOOD
    if (!to && !subject && !body) {
      return res.status(204).end();
    }

    const draft = await Mail.create({
      from: req.user.userId,
      fromDp: req.user.profilePic || null,

      to,
      subject,
      body,
      attachments,

      owner: req.user.userId,

      folder: "draft",
      isDraft: true,
      isSent: false,
    });

    res.status(201).json(draft);
  } catch (error) {
    console.error("❌ Create draft error:", error.message);
    res.status(500).json({
      message: error.message || "Failed to create draft",
    });
  }
});

/* =====================================================
   2️⃣ UPDATE DRAFT (Auto-save edits)
===================================================== */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const draft = await Mail.findOne({
      _id: req.params.id,
      owner: req.user.userId,
      isDraft: true,
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    const { to, subject, body, attachments } = req.body;

    if (to !== undefined) draft.to = to;
    if (subject !== undefined) draft.subject = subject;
    if (body !== undefined) draft.body = body;
    if (attachments !== undefined) draft.attachments = attachments;

    await draft.save();

    res.json(draft);
  } catch (error) {
    console.error("❌ Update draft error:", error.message);
    res.status(500).json({
      message: error.message || "Failed to update draft",
    });
  }
});

/* =====================================================
   3️⃣ GET ALL DRAFTS
===================================================== */
router.get("/", verifyToken, async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const drafts = await Mail.find({
      owner: req.user.userId,
      isDraft: true,
      folder: "draft",
    }).sort({ timestamp: -1 }); // ✅ matches schema

    res.json(drafts);
  } catch (error) {
    console.error("❌ Get drafts error:", error.message);
    res.status(500).json({
      message: error.message || "Failed to fetch drafts",
    });
  }
});

/* =====================================================
   4️⃣ GET SINGLE DRAFT
===================================================== */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const draft = await Mail.findOne({
      _id: req.params.id,
      owner: req.user.userId,
      isDraft: true,
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    res.json(draft);
  } catch (error) {
    console.error("❌ Get draft error:", error.message);
    res.status(500).json({
      message: error.message || "Failed to fetch draft",
    });
  }
});

/* =====================================================
   5️⃣ DELETE DRAFT
===================================================== */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const draft = await Mail.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.userId,
      isDraft: true,
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    res.json({ message: "Draft deleted successfully" });
  } catch (error) {
    console.error("❌ Delete draft error:", error.message);
    res.status(500).json({
      message: error.message || "Failed to delete draft",
    });
  }
});

/* =====================================================
   6️⃣ SEND DRAFT → SENT
===================================================== */
router.post("/send/:id", verifyToken, async (req, res) => {
  try {
    const draft = await Mail.findOne({
      _id: req.params.id,
      owner: req.user.userId,
      isDraft: true,
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    if (!draft.to) {
      return res.status(400).json({ message: "Recipient email required" });
    }

    draft.isDraft = false;
    draft.isSent = true;
    draft.folder = "sent";
    draft.sentAt = new Date();

    await draft.save();

    res.json(draft);
  } catch (error) {
    console.error("❌ Send draft error:", error.message);
    res.status(500).json({
      message: error.message || "Failed to send draft",
    });
  }
});

export default router;
