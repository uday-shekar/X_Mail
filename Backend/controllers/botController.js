// controllers/botController.js
import BotSettings from "../models/BotSettings.js";

// GET bot settings
export const getBotSettings = async (req, res) => {
  const { userId } = req.params;

  try {
    const settings = await BotSettings.findOne({ userId });
    if (!settings) return res.status(404).json({ message: "No bot settings found" });

    return res.status(200).json({ settings: settings.settings });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// SAVE / UPDATE bot settings
export const saveBotSettings = async (req, res) => {
  const { userId, settings } = req.body;
  if (!userId || !settings) return res.status(400).json({ message: "Missing data" });

  try {
    const updated = await BotSettings.findOneAndUpdate(
      { userId },
      { settings },
      { upsert: true, new: true } // create if not exists
    );
    return res.status(200).json({ settings: updated.settings });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
