import React, { useState, useEffect } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";

export default function ModifyAIbot() {
  const { user, token } = useAuth();

  const [botSettings, setBotSettings] = useState({
    name: "",
    avatar: "boy",
    voice: "male",
    language: "english",
    mood: "friendly",
    color: "#3b82f6",
    glow: "#60a5fa",
  });

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [showNamePopup, setShowNamePopup] = useState(false);

  useEffect(() => {
    // Try to get bot settings from API or localStorage
    const fetchSettings = async () => {
      // Fetch from backend if authorized
      if (user?.userId && token) {
        try {
          const res = await api.get(`/bot/${user.userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data?.settings) {
            setBotSettings(res.data.settings);
            localStorage.setItem("albot_settings", JSON.stringify(res.data.settings));
            setShowNamePopup(!res.data.settings.name?.trim());
          } else {
            setShowNamePopup(true);
          }
          return;
        } catch (err) {
          // Fall back to localStorage
        }
      }

      // Check localStorage
      const local = localStorage.getItem("albot_settings");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setBotSettings((prev) => ({ ...prev, ...parsed }));
          setShowNamePopup(!parsed.name?.trim());
        } catch {
          setShowNamePopup(true);
        }
      } else {
        setShowNamePopup(true);
      }
    };
    fetchSettings();
  }, [user, token]);

  // Save bot settings
  const handleSave = async () => {
    if (!botSettings.name.trim()) {
      setSavedMsg("❌ Bot name cannot be empty!");
      return;
    }
    setSaving(true);

    try {
      if (user?.userId && token) {
        await api.post(
          `/bot`,
          { userId: user.userId, settings: botSettings },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      localStorage.setItem("albot_settings", JSON.stringify(botSettings));
      window.dispatchEvent(new CustomEvent("albot:updateSettings", { detail: botSettings }));
      setSavedMsg("✅ Settings saved successfully!");
      setShowNamePopup(false);
    } catch (err) {
      setSavedMsg("❌ Failed to save settings!");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(""), 2500);
    }
  };

  // Handle individual field changes
  const handleChange = (field, value) => {
    setBotSettings((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Popup for naming bot (first-time users) */}
      {showNamePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-xs text-center animate-fade-in">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Name your AI friend 🤖
            </h2>
            <input
              type="text"
              value={botSettings.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter bot name"
              className="p-2 rounded-lg border border-gray-300 w-full focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSave}
              disabled={saving || !botSettings.name.trim()}
              className={`mt-4 w-full px-4 py-2 rounded-lg text-white transition-all duration-200 ${
                saving || !botSettings.name.trim()
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving..." : "✅ Save"}
            </button>
            {savedMsg && (
              <p
                className={`text-center mt-2 font-medium ${
                  savedMsg.startsWith("✅") ? "text-green-600" : "text-red-600"
                } animate-fade-in`}
              >
                {savedMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Settings Panel */}
      <div className="w-full flex justify-center items-center mt-10 px-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-3xl border border-gray-200">
          <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">
            🤖 Customize Your AL Bot
          </h1>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Bot Name */}
            <div className="flex flex-col md:col-span-2">
              <label className="font-semibold mb-2 text-gray-700">Bot Name</label>
              <input
                type="text"
                value={botSettings.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter your AI friend's name"
                className="p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>

            {/* Avatar */}
            <div className="flex flex-col">
              <label className="font-semibold mb-2 text-gray-700">Bot Avatar</label>
              <select
                value={botSettings.avatar}
                onChange={(e) => handleChange("avatar", e.target.value)}
                className="p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="boy">Boy Avatar</option>
                <option value="girl">Girl Avatar</option>
                <option value="robot">Robot</option>
                <option value="emoji">Emoji Style</option>
              </select>
            </div>

            {/* Voice */}
            <div className="flex flex-col">
              <label className="font-semibold mb-2 text-gray-700">Voice Type</label>
              <select
                value={botSettings.voice}
                onChange={(e) => handleChange("voice", e.target.value)}
                className="p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="funny">Funny</option>
                <option value="robotic">Robotic</option>
              </select>
            </div>

            {/* Language */}
            <div className="flex flex-col">
              <label className="font-semibold mb-2 text-gray-700">Language</label>
              <select
                value={botSettings.language}
                onChange={(e) => handleChange("language", e.target.value)}
                className="p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="english">English</option>
                <option value="telugu">Telugu</option>
                <option value="hindi">Hindi</option>
                <option value="tamil">Tamil</option>
              </select>
            </div>

            {/* Mood */}
            <div className="flex flex-col">
              <label className="font-semibold mb-2 text-gray-700">Bot Mood</label>
              <select
                value={botSettings.mood}
                onChange={(e) => handleChange("mood", e.target.value)}
                className="p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="friendly">Friendly 😊</option>
                <option value="serious">Serious 😐</option>
                <option value="funny">Funny 😂</option>
                <option value="calm">Calm 😌</option>
              </select>
            </div>

            {/* Color */}
            <div className="flex flex-col">
              <label className="font-semibold mb-2 text-gray-700">Bot Color</label>
              <input
                type="color"
                value={botSettings.color}
                onChange={(e) => handleChange("color", e.target.value)}
                className="w-16 h-10 rounded-lg cursor-pointer border border-gray-300"
              />
            </div>

            {/* Glow */}
            <div className="flex flex-col">
              <label className="font-semibold mb-2 text-gray-700">Glow Color</label>
              <input
                type="color"
                value={botSettings.glow}
                onChange={(e) => handleChange("glow", e.target.value)}
                className="w-16 h-10 rounded-lg cursor-pointer border border-gray-300"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center mt-8">
            <button
              onClick={handleSave}
              disabled={saving || !botSettings.name.trim()}
              className={`px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 shadow-md ${
                saving || !botSettings.name.trim()
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
            >
              {saving ? "Saving..." : "💾 Save Settings"}
            </button>
          </div>

          {/* Saved Message */}
          {savedMsg && (
            <p
              className={`text-center mt-4 font-medium ${
                savedMsg.startsWith("✅") ? "text-green-600" : "text-red-600"
              } animate-fade-in`}
            >
              {savedMsg}
            </p>
          )}

          {/* Live Preview */}
          <p className="mt-4 text-center text-lg font-semibold text-gray-700">
            Your AI friend will respond as:{" "}
            <span className="text-blue-600">{botSettings.name || "ALBot"}</span>
          </p>
        </div>
      </div>
    </>
  );
}
