// models/BotSettings.js
import mongoose from "mongoose";

const BotSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  settings: {
    name: { type: String, default: "ALBot" },
    avatar: { type: String, default: "boy" },
    voice: { type: String, default: "male" },
    language: { type: String, default: "english" },
    mood: { type: String, default: "friendly" },
    color: { type: String, default: "#3b82f6" },
    glow: { type: String, default: "#60a5fa" },
  },
});

export default mongoose.model("BotSettings", BotSettingsSchema);
