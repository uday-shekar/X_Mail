import mongoose from "mongoose";

/* =========================
   REPLY SCHEMA
========================= */
const replySchema = new mongoose.Schema(
  {
    from: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    // ⭐ Reply sender DP
    fromDp: {
      type: String,
      default: null,
    },
    text: {
      type: String,
      default: "",
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false, strict: true }
);

/* =========================
   MAIL SCHEMA
========================= */
const mailSchema = new mongoose.Schema(
  {
    /* ---------- FROM ---------- */
    from: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    // ⭐ SENDER DP (Inbox use)
    fromDp: {
      type: String,
      default: null,
    },

    /* ---------- TO ---------- */
    to: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    // ⭐ RECEIVER DP (Sent use)
    toDp: {
      type: String,
      default: null,
    },

    /* ---------- CONTENT ---------- */
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    body: {
      type: String,
      default: "",
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
    },

    /* ---------- FOLDER ---------- */
    folder: {
      type: String,
      enum: ["inbox", "sent", "deleted", "draft", "saved"],
      default: "draft",
    },

    /* ---------- STATUS FLAGS ---------- */
    isDraft: {
      type: Boolean,
      default: true, // ⭐ MOST IMPORTANT
    },
    isSent: {
      type: Boolean,
      default: false,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },

    /* ---------- OWNER ---------- */
    owner: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /* ---------- THREADING ---------- */
    parentMailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mail",
      default: null,
    },
    replies: {
      type: [replySchema],
      default: [],
    },

    /* ---------- TIMESTAMPS ---------- */
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "timestamp",
      updatedAt: false,
    },
    strict: true,
  }
);

/* =========================
   INDEXES (OPTIONAL BUT 🔥)
========================= */
mailSchema.index({ owner: 1, folder: 1 });
mailSchema.index({ owner: 1, isDraft: 1 });

export default mongoose.model("Mail", mailSchema);
