// src/components/Deleted.jsx
import React, { useEffect, useState, useMemo } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";
import UserAvatar from "./UserAvatar";

// Utility: Format date
const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Toast Component
const Toast = ({ message }) => {
  if (!message) return null;
  const isError = message.includes("❌") || message.includes("⚠️");
  const isSuccess = message.includes("✅") || message.includes("💾") || message.includes("🗑️");

  const bgColor = isError ? "bg-red-600" : isSuccess ? "bg-green-600" : "bg-gray-700";

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div className={`px-4 py-3 rounded-lg shadow-xl text-sm font-medium text-white ${bgColor}`}>
        {message}
      </div>
    </div>
  );
};

export default function Deleted({ searchTerm = "" }) {
  const { user } = useAuth();
  const [deletedMails, setDeletedMails] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  // Show toast
  const showToast = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 3000);
  };

  // Fetch Deleted Mails
  const fetchDeletedMails = async () => {
    if (!user?.accessToken) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get("/mail/deleted", {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      const mails = res.data.mails || [];
      setDeletedMails(mails);

      // Keep selected mail if it still exists, otherwise don't auto-select
      if (selectedMail) {
        const updated = mails.find((m) => m._id === selectedMail._id);
        if (updated) setSelectedMail(updated);
        else setSelectedMail(null);
      }
      // Removed auto-select on mobile - user must click to open mail
    } catch (err) {
      console.error("❌ Error fetching deleted mails:", err);
      setDeletedMails([]);
      setSelectedMail(null);
      showToast("❌ Failed to fetch deleted mails.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedMails();
    const interval = setInterval(fetchDeletedMails, 60000);
    
    // Listen for mail events to refresh
    const handleMailSent = () => {
      setTimeout(() => fetchDeletedMails(), 500);
    };
    window.addEventListener("mailSent", handleMailSent);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("mailSent", handleMailSent);
    };
  }, [user]);

  // Restore Mail
  const handleRestoreMail = async (mailId) => {
    if (!user?.accessToken) return;
    try {
      const res = await api.put(
        `/mail/restore/${mailId}`,
        {},
        { headers: { Authorization: `Bearer ${user.accessToken}` } }
      );
      if (res.data.success || res.data.message) {
        showToast("✅ Mail restored to Inbox");
        setSelectedMail(null);
        fetchDeletedMails();
      } else {
        showToast(res.data.message || "❌ Could not restore mail.");
      }
    } catch (err) {
      console.error("❌ Error restoring mail:", err);
      showToast("❌ Could not restore mail.");
    }
  };

  // Filter mails by search term
  const filteredMails = useMemo(() => {
    if (!searchTerm) return deletedMails;
    const term = searchTerm.toLowerCase();
    return deletedMails.filter(
      (mail) =>
        mail.from?.toLowerCase().includes(term) ||
        mail.to?.toLowerCase().includes(term) ||
        mail.subject?.toLowerCase().includes(term) ||
        mail.body?.toLowerCase().includes(term)
    );
  }, [deletedMails, searchTerm]);

  // Keep selected mail in sync with filtered mails
  useEffect(() => {
    if (selectedMail && !filteredMails.find((m) => m._id === selectedMail._id)) {
      setSelectedMail(null);
    }
  }, [filteredMails, selectedMail]);

  if (loading)
    return (
      <p className="text-gray-500 text-center mt-10 animate-pulse">
        Loading deleted mails...
      </p>
    );

  return (
    <>
      <div className="flex h-[calc(100vh-60px)] bg-gray-50 border-t border-gray-200">
        {/* Sidebar: Mail List - Always visible on mobile/tablet, hidden on large desktop when mail is selected */}
        <div className={`${selectedMail ? "hidden lg:block lg:w-80" : "w-full lg:w-80"} flex-shrink-0 transition-all duration-300`}>
          <div className="p-4 h-full overflow-y-auto border-r border-gray-200 bg-white">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2 border-b pb-2">
            <span className="text-red-500 text-2xl">🗑️</span> Deleted ({filteredMails.length})
          </h2>

          {filteredMails.length === 0 ? (
            <p className="text-gray-500 text-center mt-10 text-sm">No deleted mails.</p>
          ) : (
            <ul className="space-y-1">
              {filteredMails.map((mail) => (
                <li
                  key={mail._id}
                  className={`p-3 flex items-start gap-3 rounded-xl cursor-pointer transition duration-150 ${
                    selectedMail?._id === mail._id
                      ? "bg-red-100 border-l-4 border-red-500 shadow-sm"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedMail(mail);
                    setFeedback("");
                  }}
                >
                  {/* Avatar */}
                  <UserAvatar
                    email={mail.from === mail.owner ? mail.to : mail.from}
                    dp={mail.from === mail.owner ? mail.toDp : mail.fromDp}
                    size={45}
                  />

                  {/* Mail Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-semibold text-gray-800 truncate">
                        {mail.from === mail.owner ? `To: ${mail.to}` : `From: ${mail.from}`}
                      </p>
                      <p className="text-xs text-gray-500 min-w-max ml-2">
                        {formatDate(mail.timestamp)}
                      </p>
                    </div>
                    <p
                      className={`font-medium truncate ${
                        selectedMail?._id === mail._id ? "text-red-600" : "text-gray-900"
                      }`}
                    >
                      {mail.subject || "(No Subject)"}
                    </p>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {mail.body?.substring(0, 50) || "(No Content)"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>

        {/* Right Panel: Selected Mail - Hidden on mobile/tablet when no mail selected, shown on large desktop */}
        <div className={`${selectedMail ? "w-full lg:flex-1" : "hidden lg:block lg:flex-1"} p-6 overflow-y-auto transition-all duration-300`}>
          {selectedMail ? (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 animate-fade-in">
              {/* Back button for mobile/tablet */}
              <button
                onClick={() => setSelectedMail(null)}
                className="lg:hidden mb-4 flex items-center gap-2 text-red-600 hover:text-red-800 font-medium transition-colors"
              >
                <span className="text-xl">←</span>
                <span>Back to Deleted</span>
              </button>
              
              {/* Header & Actions */}
              <div className="border-b pb-4 mb-4 flex justify-between items-center">
                <div className="flex items-start gap-4">
                  <UserAvatar
                    email={selectedMail.from === selectedMail.owner ? selectedMail.to : selectedMail.from}
                    dp={selectedMail.from === selectedMail.owner ? selectedMail.toDp : selectedMail.fromDp}
                    size={56}
                  />
                  <div>
                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
                      {selectedMail.subject || "(No Subject)"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedMail.from === selectedMail.owner
                        ? `To: ${selectedMail.to}`
                        : `From: ${selectedMail.from}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(selectedMail.timestamp)}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleRestoreMail(selectedMail._id)}
                  className="flex items-center bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  Restore
                </button>
              </div>

              {/* Mail Body */}
              <p className="whitespace-pre-line text-gray-800 mb-6">{selectedMail.body || "(No Content)"}</p>

              {/* Attachments */}
              {selectedMail.attachments?.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-gray-700 mb-2 font-semibold">📎 Attachments:</p>
                  <div className="flex gap-3 flex-wrap">
                    {selectedMail.attachments.map((file, idx) => (
                      <a
                        key={idx}
                        href={`${api.defaults.baseURL || "http://localhost:5000"}${file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm hover:underline bg-blue-50 px-3 py-1 rounded-full border border-blue-200 transition"
                      >
                        {file.split("/").pop()}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-center">
              {filteredMails.length > 0 ? <p>Select a mail to view its contents.</p> : <p>No deleted mails.</p>}
            </div>
          )}
        </div>
      </div>

      <Toast message={feedback} />
    </>
  );
}
