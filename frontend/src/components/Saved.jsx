import React, { useEffect, useState, useMemo } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";
import UserAvatar from "./UserAvatar";

// Utility: Format date
const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
};

export default function Saved({ searchTerm = "" }) {
  const { user } = useAuth();
  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMail, setSelectedMail] = useState(null);
  const [feedback, setFeedback] = useState("");

  // Fetch saved mails
  const fetchSavedMails = async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    try {
      const res = await api.get("/mail/saved", {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      const fetchedMails = res.data.mails || [];
      const sorted = [...fetchedMails].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      setMails(sorted);
      // Keep selected mail if it still exists, otherwise don't auto-select
      if (selectedMail) {
        const updated = sorted.find((m) => m._id === selectedMail._id);
        if (updated) setSelectedMail(updated);
        else setSelectedMail(null);
      }
      // Removed auto-select on mobile - user must click to open mail
    } catch (err) {
      console.error("❌ Error fetching saved mails:", err);
      setFeedback("❌ Failed to fetch saved mails. Please log in again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedMails();
    
    // Listen for mail events to refresh
    const handleMailSent = () => {
      setTimeout(() => fetchSavedMails(), 500);
    };
    window.addEventListener("mailSent", handleMailSent);
    
    return () => {
      window.removeEventListener("mailSent", handleMailSent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accessToken]);

  // Restore mail
  const handleRestoreMail = async (mailId) => {
    if (!user?.accessToken) return;
    try {
      const res = await api.put(
        `/mail/restore/${mailId}`,
        {},
        { headers: { Authorization: `Bearer ${user.accessToken}` } }
      );
      if (res.data.success || res.data.message) {
        setFeedback("✅ Mail restored to Inbox");
        fetchSavedMails();
      } else setFeedback(res.data.message || "❌ Could not restore mail.");
    } catch (err) {
      console.error("❌ Error restoring mail:", err);
      setFeedback("❌ Could not restore mail.");
    }
  };

  // Delete mail (move to Deleted)
  const handleDeleteMail = async (mailId) => {
    if (!user?.accessToken) return;
    try {
      await api.put(
        `/mail/trash/${mailId}`,
        {},
        { headers: { Authorization: `Bearer ${user.accessToken}` } }
      );
      setFeedback("🗑️ Mail moved to Deleted");
      fetchSavedMails();
    } catch (err) {
      console.error("❌ Error deleting mail:", err);
      setFeedback("❌ Could not delete mail.");
    }
  };

  // Filter mails by search term
  const filteredMails = useMemo(() => {
    if (!searchTerm) return mails;
    const term = searchTerm.toLowerCase();
    return mails.filter(
      (mail) =>
        mail.from?.toLowerCase().includes(term) ||
        mail.subject?.toLowerCase().includes(term) ||
        mail.body?.toLowerCase().includes(term)
    );
  }, [mails, searchTerm]);

  useEffect(() => {
    if (selectedMail && !filteredMails.find((m) => m._id === selectedMail._id))
      setSelectedMail(null);
  }, [filteredMails, selectedMail]);

  if (loading)
    return (
      <p className="text-gray-500 text-center mt-10">Loading saved mails...</p>
    );

  return (
    <div className="flex h-[calc(100vh-60px)] bg-gray-50 border-t border-gray-200">
      {/* Sidebar - Always visible on mobile/tablet, hidden on large desktop when mail is selected */}
      <div className={`${selectedMail ? "hidden lg:block lg:w-80" : "w-full lg:w-80"} flex-shrink-0 transition-all duration-300`}>
        <div className="p-4 h-full overflow-y-auto border-r border-gray-200 bg-white">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2 border-b pb-2">
          <span className="text-green-600 text-2xl">💾</span> Saved ({filteredMails.length})
        </h2>

        {filteredMails.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">No saved mails.</p>
        ) : (
          <ul className="space-y-1">
            {filteredMails.map((mail) => (
              <li
                key={mail._id}
                className={`p-3 flex items-start gap-3 rounded-xl cursor-pointer transition duration-150 ${
                  selectedMail?._id === mail._id
                    ? "bg-blue-100 border-l-4 border-blue-600 shadow-sm"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => {
                  setSelectedMail(mail);
                  setFeedback("");
                }}
              >
                <UserAvatar email={mail.from} dp={mail.fromDp} size={45} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-gray-800 truncate">{mail.from}</p>
                    <p className="text-xs text-gray-500 min-w-max ml-2">{formatDate(mail.timestamp)}</p>
                  </div>
                  <p
                    className={`font-medium truncate ${
                      selectedMail?._id === mail._id ? "text-blue-600" : "text-gray-900"
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

      {/* Right Panel - Hidden on mobile/tablet when no mail selected, shown on large desktop */}
      <div className={`${selectedMail ? "w-full lg:flex-1" : "hidden lg:block lg:flex-1"} p-6 overflow-y-auto transition-all duration-300`}>
        {feedback && (
          <div
            className={`p-3 rounded-lg text-center mb-4 ${
              feedback.includes("❌") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {feedback}
          </div>
        )}

        {selectedMail ? (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 animate-fade-in">
            {/* Back button for mobile/tablet */}
            <button
              onClick={() => setSelectedMail(null)}
              className="lg:hidden mb-4 flex items-center gap-2 text-green-600 hover:text-green-800 font-medium transition-colors"
            >
              <span className="text-xl">←</span>
              <span>Back to Saved</span>
            </button>
            
            <div className="border-b pb-4 mb-4 flex justify-between items-center">
              <div className="flex items-start gap-4">
                <UserAvatar email={selectedMail.from} dp={selectedMail.fromDp} size={56} />
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
                    {selectedMail.subject || "(No Subject)"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    From: <span className="text-blue-600 font-medium">{selectedMail.from}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(selectedMail.timestamp)}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleRestoreMail(selectedMail._id)}
                  className="flex items-center bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  Restore
                </button>
                <button
                  onClick={() => handleDeleteMail(selectedMail._id)}
                  className="flex items-center bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </div>

            <p className="whitespace-pre-line text-gray-800 mb-6">{selectedMail.body || "(No Content)"}</p>

            {selectedMail.attachments?.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-gray-700 mb-2 font-semibold">📎 Attachments:</p>
                <div className="flex gap-3 flex-wrap">
                  {selectedMail.attachments.map((file, idx) => (
                    <a
                      key={idx}
                      href={`${api.defaults.baseURL || ""}${file}`}
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
            {filteredMails.length > 0 ? <p>Select a mail to view its contents.</p> : <p>No saved mails.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
