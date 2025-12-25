// src/components/SettingsModal.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";
import { getInitials, stringToColor } from "../utils/avatarUtils";
import { Instagram, Mail, User, Shield } from "lucide-react";

/* ===========================================================
   🧩 Profile Settings
=========================================================== */
const ProfileSettings = ({ user, setFeedback, onUpdate }) => {
  const [profileFile, setProfileFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleProfilePicChange = async () => {
    if (!profileFile) return setFeedback("⚠️ Please select a file first.");

    setUploading(true);
    setFeedback("");

    try {
      const formData = new FormData();
      formData.append("profilePic", profileFile);

      const res = await api.post("/user/profile/pic", formData, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        setFeedback("✅ Profile picture updated successfully!");

        const fresh = await api.get("/user/me", {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });

        onUpdate(fresh.data.user.profilePic);
      } else {
        setFeedback(res.data.message || "❌ Upload failed.");
      }
    } catch (err) {
      console.error("Profile upload error:", err);
      setFeedback("❌ Server error during upload.");
    } finally {
      setUploading(false);
      setProfileFile(null);
    }
  };

  const initials = getInitials(user?.username || user?.userId || "?");
  const color = stringToColor(user?.username || user?.userId || "?");

  return (
    <motion.div
      key="profile-tab"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className="space-y-4"
    >
      <h3 className="text-xl font-semibold border-b pb-2 text-gray-700 flex items-center gap-2">
        <User className="w-5 h-5" /> Profile & Theme
      </h3>

      <div className="p-3 bg-white rounded-lg border shadow-sm space-y-2">
        <p className="text-sm text-gray-500">
          User ID: <span className="font-mono text-gray-800 break-all">{user.userId}</span>
        </p>
        <p className="text-sm text-gray-500">
          Username: <span className="font-semibold text-gray-800">{user.username}</span>
        </p>
      </div>

      <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border">
        {user?.profilePic ? (
          <img
            src={`${user.profilePic}?cache=${Date.now()}`}
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover shadow-lg flex-shrink-0"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg flex-shrink-0"
            style={{ background: color, color: "#fff" }}
          >
            {initials}
          </div>
        )}

        <div className="flex flex-col gap-2 flex-grow">
          <p className="font-medium text-gray-800">Change Profile Picture:</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-600 file:mr-4 file:py-1 file:px-3
            file:rounded-full file:border-0 file:text-sm file:font-semibold
            file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
          />
          <button
            onClick={handleProfilePicChange}
            disabled={!profileFile || uploading}
           className="w-fit bg-black hover:bg-gray-800 text-white text-sm py-1.5 px-4 rounded-lg transition disabled:opacity-50"

          >
            {uploading ? "Uploading..." : "Upload Photo"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ===========================================================
   🔒 Security Settings
=========================================================== */
const SecuritySettings = ({ user, setFeedback }) => {
  const { setUser } = useAuth();
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUsernameUpdate = async () => {
    if (!newUsername.trim()) return setFeedback("⚠️ Username cannot be empty.");
    if (newUsername === user.username) return setFeedback("⚠️ Username unchanged.");
    if (newUsername.length < 3) return setFeedback("⚠️ Minimum 3 characters for username.");

    setIsUpdating(true);
    setFeedback("");

    try {
      const res = await api.put(
        "mail/profile/username",
        { username: newUsername },
        { headers: { Authorization: `Bearer ${user.accessToken}` } }
      );

      if (res.data.success) {
        setFeedback("✅ Username updated successfully!");
        setUser({ ...user, username: newUsername });
      } else {
        setFeedback(res.data.message || "❌ Username update failed.");
      }
    } catch (err) {
      console.error("Username update error:", err);
      setFeedback("❌ Server error during username update.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordUpdate = async () => {
  if (!oldPassword) return setFeedback("⚠️ Enter current password.");
  if (newPassword.length < 6)
    return setFeedback("⚠️ New password requires minimum 6 characters.");

  setIsUpdating(true);
  setFeedback("");

  try {
    const res = await api.put(
      "/user/profile/password",   // ✅ correct URL
      { oldPassword, newPassword },
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`, // ✅ token
        },
      }
    );

    if (res.data.success) {
      setFeedback("✅ Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
    } else {
      setFeedback(res.data.message || "❌ Password update failed.");
    }
  } catch (err) {
    console.error("Password update error:", err.response?.data || err);
    setFeedback(
      err.response?.data?.message || "❌ Server error during password update."
    );
  } finally {
    setIsUpdating(false);
  }
};


  return (
    <motion.div
      key="security-tab"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className="space-y-6"
    >
      <h3 className="text-xl font-semibold border-b pb-2 text-gray-700 flex items-center gap-2">
        <Shield className="w-5 h-5" /> Account & Security
      </h3>

      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="font-medium text-gray-800 mb-1">User ID: <span className="font-mono text-sm">{user.userId}</span></p>
        <p className="text-sm text-yellow-800">The User ID is created only once and cannot be changed.</p>
      </div>

      <div className="p-3 bg-gray-50 rounded-lg border">
        <p className="font-medium text-gray-800 mb-2">Change Username (Current: {user.username}):</p>
        <input
          type="text"
          placeholder="New Username"
          className="w-full p-2 border rounded-lg mb-2 focus:ring-blue-500 focus:border-blue-500"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
        />
        <button
          onClick={handleUsernameUpdate}
          disabled={isUpdating || newUsername.trim().length < 3 || newUsername === user.username}
          className="bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 px-4 rounded-lg transition disabled:opacity-50"
        >
          {isUpdating ? "Updating..." : "Update Username"}
        </button>
      </div>

      <div className="p-3 bg-gray-50 rounded-lg border">
        <p className="font-medium text-gray-800 mb-2">Change Password:</p>
        <input
          type="password"
          placeholder="Current password"
          className="w-full p-2 border rounded-lg mb-2 focus:ring-red-500 focus:border-red-500"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="New password (min 6 characters)"
          className="w-full p-2 border rounded-lg mb-2 focus:ring-red-500 focus:border-red-500"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button
          onClick={handlePasswordUpdate}
          disabled={isUpdating || !oldPassword || newPassword.length < 6}
          className="bg-red-600 hover:bg-red-700 text-white text-sm py-1.5 px-4 rounded-lg transition disabled:opacity-50"
        >
          {isUpdating ? "Updating..." : "Update Password"}
        </button>
      </div>
    </motion.div>
  );
};

/* ===========================================================
   📞 Contact Us Settings
=========================================================== */
const ContactUsSettings = () => {
  const contactEmail = "xmail@xmail.com";
  const instagramHandle = "xmail_official";
  const instagramUrl = `https://instagram.com/${instagramHandle}`;

  return (
    <motion.div
      key="contact-tab"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className="space-y-6"
    >
      <h3 className="text-xl font-semibold border-b pb-2 text-gray-700 flex items-center gap-2">
        <Mail className="w-5 h-5" /> Contact Us
      </h3>

      <div className="p-5 bg-blue-50 rounded-lg border border-blue-200 shadow-md">
        <p className="text-lg font-medium text-blue-800 mb-4">
          If you have any problems, please contact us:
        </p>

        <div className="space-y-3">
          <a
            href={`mailto:${contactEmail}`}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:bg-gray-100 transition"
          >
            <Mail className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-semibold text-gray-700">Email Support</p>
              <p className="text-sm text-gray-600">{contactEmail}</p>
            </div>
          </a>

          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:bg-gray-100 transition"
          >
            <Instagram className="w-6 h-6 text-pink-600" />
            <div>
              <p className="font-semibold text-gray-700">Follow us on Instagram</p>
              <p className="text-sm text-gray-600">@{instagramHandle}</p>
            </div>
          </a>
        </div>
      </div>
    </motion.div>
  );
};

/* ===========================================================
   🪟 Settings Modal
=========================================================== */
export default function SettingsModal({ onClose }) {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [feedback, setFeedback] = useState("");

  if (!user) return null;

  const handleProfileUpdate = (newPicUrl) => {
    const updated = { ...user, profilePic: newPicUrl };
    localStorage.setItem("xmailUser", JSON.stringify(updated));
    setUser(updated);
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
    { id: "contact", label: "Contact Us", icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="modal-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="modal-panel"
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          transition={{ type: "spring", stiffness: 210, damping: 22 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] md:h-[90vh] flex flex-col mx-2 md:mx-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 md:p-5 border-b flex justify-between items-center">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900">User Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100"
            >
              ✖
            </button>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-3 text-center mx-5 mt-3 rounded-lg text-sm ${
                  feedback.includes("❌") || feedback.includes("⚠️")
                    ? "bg-red-100 text-red-700"
                    : feedback.includes("✅")
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col md:flex-row flex-1 overflow-hidden pt-2 md:pt-3">
            <nav className="w-full md:w-56 p-2 md:p-4 border-r-0 md:border-r border-b md:border-b-0 bg-gray-50 flex-shrink-0 flex flex-row md:flex-col space-x-2 md:space-x-0 space-y-0 md:space-y-2 overflow-x-auto md:overflow-x-visible">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setFeedback("");
                  }}
                  className={`flex-shrink-0 text-left py-2 px-3 rounded-lg font-medium capitalize flex items-center gap-2 md:gap-3 transition-colors text-sm md:text-base ${
  activeTab === tab.id
    ? "bg-black text-white shadow-md"   // ✅ Active tab is black
    : "text-gray-700 hover:bg-gray-200" // Inactive tab
}`}

                >
                  {tab.icon} <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="flex-1 p-3 md:p-6 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === "profile" && (
                  <ProfileSettings
                    user={user}
                    setFeedback={setFeedback}
                    onUpdate={handleProfileUpdate}
                    key="profile"
                  />
                )}

                {activeTab === "security" && (
                  <SecuritySettings
                    user={user}
                    setFeedback={setFeedback}
                    key="security"
                  />
                )}

                {activeTab === "contact" && <ContactUsSettings key="contact" />}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
