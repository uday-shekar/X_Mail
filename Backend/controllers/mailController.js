// controllers/mailController.js
import path from "path";
import { fileURLToPath } from "url";
import { unlink } from "fs/promises";
import fs from "fs";
import dotenv from "dotenv";
import Mail from "../models/Mail.js";
import User from "../models/User.js";
import { io, onlineUsers } from "../server.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// ✅ Initialize Gemini AI safely
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const composeMail = async (req, res) => {
  try {
    const senderId = req.user?.userId;
    let { to, subject, body } = req.body;

    const attachments =
      req.files?.map((file) => `/uploads/${file.filename}`) || [];

    if (!senderId || !to || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    to = to.trim().toLowerCase();
    subject = subject.trim();
    body = body.trim();

    if (!to.endsWith("@xmail.com")) {
      return res.status(400).json({
        success: false,
        message: "Recipient must end with @xmail.com",
      });
    }

    // GET USERS
    const sender = await User.findOne({ userId: senderId });
    const receiver = await User.findOne({ userId: to });

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender not found.",
      });
    }

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found.",
      });
    }

    // DP values - use the profilePic path as stored in database
    // profilePic is stored as "/uploads/profilePics/filename.jpg"
    const senderDp = sender?.profilePic || null;
    const receiverDp = receiver?.profilePic || null;

    // ----------------------------------
    // SENT MAIL (owner = sender)
    // ----------------------------------
    const sentMail = new Mail({
      from: senderId,
      fromDp: senderDp,

      to,
      toDp: receiverDp,    // ⭐ IMPORTANT - Shows recipient DP in Sent folder

      subject,
      body,
      owner: senderId,
      folder: "sent",
      attachments,
      isRead: true,
      isDraft: false,
      isSent: true,
      sentAt: new Date(),
    });

    // ----------------------------------
    // INBOX MAIL (owner = receiver)
    // ----------------------------------
    let inboxMail = null;

    if (senderId !== receiver.userId) {
      inboxMail = new Mail({
        from: senderId,
        fromDp: senderDp,   // inbox lo sender dp undali

        to,
        toDp: receiverDp,   // ok tho but not used in inbox; still stored

        subject,
        body,
        owner: receiver.userId,
        folder: "inbox",
        attachments,
        isRead: false,
        isDraft: false,
        isSent: true,
        sentAt: new Date(),
      });
    }

    // Save both mails
    if (inboxMail) {
      await Promise.all([sentMail.save(), inboxMail.save()]);
    } else {
      await sentMail.save();
    }

    return res.status(201).json({
      success: true,
      message: "Mail sent successfully.",
    });

  } catch (err) {
    console.error("❌ composeMail Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error.",
    });
  }
};



/* ----------------- REPLY MAIL ----------------- */
export const replyMail = async (req, res) => {
  try {
    const { replyText, replyMode, subject, to, cc, bcc } = req.body || {};
    const mailId = req.params.mailId;
    const userId = req.user?.userId;

    if (!replyText && !req.files?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Reply text or attachment required." });
    }

    // Find the original mail
    const originalMail = await Mail.findOne({ _id: mailId, owner: userId });
    if (!originalMail)
      return res.status(404).json({ success: false, message: "Mail not found." });

    const attachments = req.files?.map((file) => `/uploads/${file.filename}`) || [];

    // Get sender and recipient info
    const sender = await User.findOne({ userId });
    const senderDp = sender?.profilePic || null;

    // Determine recipient based on reply mode
    let recipientEmail = to?.trim().toLowerCase() || originalMail.from;
    if (replyMode === "forward" && !to) {
      return res.status(400).json({ success: false, message: "Recipient required for forward." });
    }

    const receiver = await User.findOne({ userId: recipientEmail });
    if (!receiver) {
      return res.status(404).json({ success: false, message: "Recipient not found." });
    }
    const receiverDp = receiver?.profilePic || null;

    // Create reply object for the original mail's replies array
    const reply = {
      from: userId,
      fromDp: senderDp,
      text: replyText?.trim() || "",
      attachments,
      timestamp: new Date(),
    };

    // Add reply to original mail
    originalMail.replies = originalMail.replies || [];
    originalMail.replies.push(reply);
    await originalMail.save();

    // Create new mail in Sent folder for the sender
    const replySubject = subject || (replyMode === "forward" ? `Fwd: ${originalMail.subject}` : `Re: ${originalMail.subject}`);
    const sentReplyMail = new Mail({
      from: userId,
      fromDp: senderDp,
      to: recipientEmail,
      toDp: receiverDp,
      subject: replySubject,
      body: replyText?.trim() || "",
      owner: userId,
      folder: "sent",
      attachments,
      isRead: true,
      isDraft: false,
      isSent: true,
      sentAt: new Date(),
      parentMailId: originalMail._id,
    });

    // Create new mail in Inbox folder for the recipient (if not replying to self)
    let inboxReplyMail = null;
    if (userId !== recipientEmail) {
      inboxReplyMail = new Mail({
        from: userId,
        fromDp: senderDp,
        to: recipientEmail,
        toDp: receiverDp,
        subject: replySubject,
        body: replyText?.trim() || "",
        owner: recipientEmail,
        folder: "inbox",
        attachments,
        isRead: false,
        isDraft: false,
        isSent: true,
        sentAt: new Date(),
        parentMailId: originalMail._id,
      });
    }

    // Save both mails
    if (inboxReplyMail) {
      await Promise.all([sentReplyMail.save(), inboxReplyMail.save()]);
    } else {
      await sentReplyMail.save();
    }

    res
      .status(200)
      .json({ success: true, message: "Reply sent successfully!", reply });
  } catch (err) {
    console.error("❌ replyMail error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error while replying." });
  }
};

/* ----------------- FETCH MAILS ----------------- */
const fetchMails = async (folder, req, res) => {
  try {
    const userId = req.user?.userId;
    const mails = await Mail.find({ owner: userId, folder }).sort({ timestamp: -1 });
    res.status(200).json({ success: true, mails });
  } catch (err) {
    console.error(`❌ ${folder} Mail Error:`, err.message);
    res
      .status(500)
      .json({ success: false, message: `Failed to fetch ${folder} mails` });
  }
};

export const getInbox = (req, res) => fetchMails("inbox", req, res);
export const getSent = (req, res) => fetchMails("sent", req, res);
export const getDeleted = (req, res) => fetchMails("deleted", req, res);
export const getSaved = (req, res) => fetchMails("saved", req, res);
export const getDrafts = (req, res) => fetchMails("draft", req, res);

/* ----------------- DELETE / SAVE / RESTORE ----------------- */
export const deleteMail = async (req, res) => {
  try {
    const mailId = req.params.mailId;
    const userId = req.user?.userId;

    const mail = await Mail.findOneAndUpdate(
      { _id: mailId, owner: userId },
      { folder: "deleted" },
      { new: true }
    );

    if (!mail)
      return res
        .status(404)
        .json({ success: false, message: "Mail not found or not owned by user" });

    res.status(200).json({ success: true, message: "Mail moved to deleted folder" });
  } catch (err) {
    console.error("❌ deleteMail Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete mail" });
  }
};

export const saveMail = async (req, res) => {
  try {
    const mailId = req.params.mailId;
    const userId = req.user?.userId;

    const mail = await Mail.findOne({ _id: mailId, owner: userId });
    if (!mail) return res.status(404).json({ success: false, message: "Mail not found" });

    mail.originalFolder = mail.folder;
    mail.folder = "saved";
    await mail.save();

    res.status(200).json({ success: true, message: "Mail saved successfully", mail });
  } catch (err) {
    console.error("❌ saveMail Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to save mail" });
  }
};

export const restoreMail = async (req, res) => {
  try {
    const mailId = req.params.mailId;
    const userId = req.user?.userId;
    const mail = await Mail.findOne({ _id: mailId, owner: userId });

    if (!mail)
      return res
        .status(404)
        .json({ success: false, message: "Mail not found or not owned by user" });

    let targetFolder = "inbox";
    if (mail.folder === "deleted" || mail.folder === "saved") {
      targetFolder = mail.originalFolder || "inbox";
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Mail is not in a restorable folder" });
    }

    mail.folder = targetFolder;
    await mail.save();

    res
      .status(200)
      .json({ success: true, message: `Mail restored to ${targetFolder}`, mail });
  } catch (err) {
    console.error("❌ restoreMail Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to restore mail" });
  }
};

/* ----------------- MARK AS READ ----------------- */
export const markMailAsRead = async (req, res) => {
  try {
    const { mailId } = req.params;
    const userId = req.user?.userId;

    const mail = await Mail.findById(mailId);
    if (!mail) return res.status(404).json({ success: false, message: "Mail not found" });
    if (mail.owner.toString() !== userId.toString() || mail.folder !== "inbox") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    mail.isRead = true;
    await mail.save();

    res.status(200).json({ success: true, message: "Mail marked as read" });
  } catch (err) {
    console.error("❌ markMailAsRead Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ----------------- TOGGLE STAR ----------------- */
export const toggleStar = async (req, res) => {
  try {
    const mailId = req.params.mailId;
    const mail = await Mail.findById(mailId);
    if (!mail) return res.status(404).json({ success: false, message: "Mail not found" });

    mail.isStarred = !mail.isStarred;
    await mail.save();

    res.status(200).json({ success: true, isStarred: mail.isStarred });
  } catch (err) {
    console.error("❌ toggleStar Error:", err.message);
    res.status(500).json({ success: false, message: "Error updating star status" });
  }
};

/* ----------------- SEARCH MAIL ----------------- */
export const searchMail = async (req, res) => {
  try {
    const { keyword } = req.query;
    const userId = req.user?.userId;

    const mails = await Mail.find({
      owner: userId,
      $or: [
        { subject: { $regex: keyword, $options: "i" } },
        { body: { $regex: keyword, $options: "i" } },
        { to: { $regex: keyword, $options: "i" } },
        { from: { $regex: keyword, $options: "i" } },
      ],
    }).sort({ timestamp: -1 });

    res.status(200).json({ success: true, mails });
  } catch (err) {
    console.error("❌ searchMail Error:", err.message);
    res.status(500).json({ success: false, message: "Error searching mails" });
  }
};

/* ----------------- DOWNLOAD ATTACHMENT ----------------- */
export const downloadAttachment = async (req, res) => {
  try {
    const fileName = req.params.filename;
    const filePath = path.join(process.cwd(), "uploads", fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    return res.download(filePath);
  } catch (err) {
    console.error("❌ Download Error:", err.message);
    res.status(500).json({ success: false, message: "Error downloading file" });
  }
};

/* ----------------- SAVE DRAFT ----------------- */
export const saveDraft = async (req, res) => {
  try {
    const { to = "", subject = "", body = "" } = req.body;
    const from = req.user?.userId;

    const draft = new Mail({ from, to, subject, body, folder: "draft", owner: from });
    await draft.save();

    res
      .status(200)
      .json({ success: true, message: "Draft saved successfully", draft });
  } catch (err) {
    console.error("❌ saveDraft Error:", err.message);
    res.status(500).json({ success: false, message: "Error saving draft" });
  }
};

/* ----------------- VOICE MAIL ----------------- */
export const voiceMail = async (req, res) => {
  try {
    const file = req.file;
    if (!file)
      return res.status(400).json({ success: false, message: "No audio uploaded" });

    const text = "[Voice transcription with Gemini coming soon]";
    if (fs.existsSync(file.path)) await unlink(file.path);

    res.status(200).json({ success: true, message: "Voice converted to text", text });
  } catch (err) {
    console.error("❌ voiceMail Error:", err.message);
    res.status(500).json({ success: false, message: "Voice to text failed" });
  }
};

/* ----------------- SMART COMPOSE (Gemini AI) ----------------- */
export const smartCompose = async (req, res) => {
  try {
    const { subject, context } = req.body;
    if (!subject)
      return res.status(400).json({ success: false, message: "Subject required" });

    const prompt = `
      Generate a professional email body for:
      Subject: ${subject}
      Context: ${context || "No extra context provided"}
      Respond in JSON format:
      { "subject": "Final Subject", "body": "Generated Email Body" }
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);

    let aiText = result.response.text();
    let data;
    try {
      data = JSON.parse(aiText);
    } catch {
      data = { subject, body: aiText };
    }

    res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error("❌ SmartCompose Error:", err.message);
    res.status(500).json({ success: false, message: "AI suggestion failed" });
  }
};

/* ----------------- GET NEW MAIL COUNT ----------------- */
export const getNewMailCount = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const count = await Mail.countDocuments({
      owner: userId,
      folder: "inbox",
      isRead: false,
    });

    res.status(200).json({ success: true, count });
  } catch (err) {
    console.error("❌ getNewMailCount Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// -------------------- Update Username --------------------
export const updateUsername = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username: newUsername } = req.body; // rename to 'username' to match frontend

    if (!newUsername)
      return res.status(400).json({ success: false, message: "New username required" });

    const existing = await User.findOne({ username: newUsername });
    if (existing)
      return res.status(409).json({ success: false, message: "Username already taken" });

    const user = await User.findByIdAndUpdate(
      userId,
      { username: newUsername },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Username updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic || null,
      },
    });
  } catch (err) {
    console.error("Username update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // CHECK CURRENT PASSWORD
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Current password incorrect" });

    // HASH NEW PASSWORD
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.log("Password update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
