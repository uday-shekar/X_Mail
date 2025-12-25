import React, { useEffect, useState, useMemo } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";
import UserAvatar from "./UserAvatar";

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

// --- Toast Component ---

const Toast = ({ message }) => {
    if (!message) return null;
    const isError = message.includes("❌") || message.includes("⚠️");
    const isSuccess =
        message.includes("✅") || message.includes("💾") || message.includes("🗑️");

    let bgColor = "bg-gray-700";
    if (isError) bgColor = "bg-red-600";
    else if (isSuccess) bgColor = "bg-green-600";

    return (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div
                className={`px-4 py-3 rounded-lg shadow-xl text-sm font-medium text-white ${bgColor}`}
            >
                {message}
            </div>
        </div>
    );
};

// --- Inbox Component ---

export default function Inbox({ onNewMail, searchTerm = "" }) {
    const { user } = useAuth();
    const [mails, setMails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMail, setSelectedMail] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [replyFiles, setReplyFiles] = useState([]);
    const [feedback, setFeedback] = useState("");
    const [replyLoading, setReplyLoading] = useState(false);
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [replyMode, setReplyMode] = useState("reply");
    const [seenMailIds, setSeenMailIds] = useState(new Set());
    const [unreadCount, setUnreadCount] = useState(0);

    const showToast = (msg) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(""), 3000);
    };

    const handleReplyFileChange = (e) => setReplyFiles([...e.target.files]);

    const formatReplyText = (originalText, replyText, mode) => {
        const separator = "\n\n" + "─".repeat(50) + "\n";
        if (mode === "forward") {
            return `---------- Forwarded message ---------\nFrom: ${selectedMail?.from}\nDate: ${formatDate(selectedMail?.timestamp)}\nSubject: ${selectedMail?.subject}\n\n${originalText}\n\n${separator}\n${replyText}`;
        } else {
            return `${replyText}\n\n${separator}\nOn ${formatDate(selectedMail?.timestamp)}, ${selectedMail?.from} wrote:\n\n${originalText}`;
        }
    };

    const resetReplyState = () => {
        setReplyText("");
        setReplyFiles([]);
        setShowReplyBox(false);
        setReplyMode("reply");
    };

    const handleReply = async () => {
        if (!selectedMail?._id) return;
        if (!replyText.trim() && replyFiles.length === 0) {
            return showToast("⚠️ Add a reply message or file.");
        }
        if (!user?.accessToken) return showToast("❌ Please log in.");

        setReplyLoading(true);
        try {
            const formData = new FormData();
            // Send only the reply text, not the formatted text with "On content"
            // The backend will create a new mail with just the reply text
            formData.append("replyText", replyText.trim());
            formData.append("replyMode", replyMode);
            
            // For forward mode, we need recipient
            if (replyMode === "forward") {
                // In forward mode, user should enter recipient in the reply box
                // For now, use the original sender as recipient (user can change this)
                formData.append("to", selectedMail.from || "");
            } else {
                // For reply/reply-all, send to original sender
                formData.append("to", selectedMail.from || "");
            }
            
            formData.append("subject", replyMode === "forward" ? `Fwd: ${selectedMail.subject || ""}` : `Re: ${selectedMail.subject || ""}`);
            replyFiles.forEach((file) => formData.append("attachments", file));
            
            const res = await api.post(`/mail/reply/${selectedMail._id}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${user.accessToken}`,
                },
            });
            if (res.data.success) {
                const actionText = replyMode === "forward" ? "Forwarded" : replyMode === "reply-all" ? "Replied to all" : "Replied";
                showToast(`✅ ${actionText} successfully!`);
                resetReplyState();
                setSelectedMail((prev) => ({
                    ...prev,
                    replies: [...(prev.replies || []), res.data.reply],
                }));
                await loadInbox(false);
            } else showToast("❌ Failed to send reply.");
        } catch (err) {
            console.error("❌ Reply error:", err);
            const errorMsg = err.response?.data?.message || err.message || "Reply failed. Try again.";
            showToast(`❌ ${errorMsg}`);
        } finally {
            setReplyLoading(false);
        }
    };

    const handleDeleteMail = async (mailId) => {
        if (!user?.accessToken) return;
        try {
            await api.put(
                `/mail/trash/${mailId}`,
                {},
                { headers: { Authorization: `Bearer ${user.accessToken}` } }
            );
            showToast("🗑️ Mail moved to trash.");
            setSelectedMail(null);
            await loadInbox(false);
        } catch (err) {
            console.error("❌ Delete error:", err);
            showToast("❌ Could not delete mail.");
        }
    };

    const handleSaveMail = async (mailId) => {
        if (!user?.accessToken) return;
        try {
            await api.put(
                `/mail/save/${mailId}`,
                {},
                { headers: { Authorization: `Bearer ${user.accessToken}` } }
            );
            showToast("💾 Mail saved successfully.");
            setSelectedMail(null);
            await loadInbox(false);
        } catch (err) {
            console.error("❌ Save error:", err);
            showToast("❌ Could not save mail.");
        }
    };

    const markAsRead = async (mailId) => {
        if (!user?.accessToken) return;
        setMails((prev) =>
            prev.map((m) => (m._id === mailId ? { ...m, isRead: true } : m))
        );
        if (selectedMail?._id === mailId)
            setSelectedMail((prev) => ({ ...prev, isRead: true }));
        try {
            await api.put(
                `/mail/read/${mailId}`,
                {},
                { headers: { Authorization: `Bearer ${user.accessToken}` } }
            );
        } catch (err) {
            console.error("❌ Mark as read error:", err);
        }
    };

    const loadInbox = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        if (!user?.accessToken) {
            showToast("❌ Please log in to view your inbox.");
            setLoading(false);
            return;
        }
        try {
            const res = await api.get("/mail/inbox", {
                headers: { Authorization: `Bearer ${user.accessToken}` },
            });
            const inboxMails = res.data?.mails || [];
            const sortedMails = [...inboxMails].sort(
                (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            );
            setMails(sortedMails);
            const newUnreadCount = sortedMails.filter((m) => !m.isRead).length;
            setUnreadCount(newUnreadCount);
            if (selectedMail) {
                const updated = sortedMails.find((m) => m._id === selectedMail._id);
                if (updated) setSelectedMail(updated);
                else setSelectedMail(null);
            }
            // Removed auto-select on mobile - user must click to open mail
            const newMails = sortedMails.filter((m) => !seenMailIds.has(m._id));
            if (newMails.length > 0) {
                setSeenMailIds((prev) => {
                    const updatedSet = new Set(prev);
                    newMails.forEach((m) => updatedSet.add(m._id));
                    return updatedSet;
                });
                if (onNewMail) onNewMail(newMails);
            }
        } catch (err) {
            console.error("❌ Error loading inbox:", err);
            setMails([]);
            showToast("❌ Failed to load inbox mails.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadInbox();
            const interval = setInterval(() => loadInbox(false), 60000);
            
            // Listen for mail sent events to refresh inbox
            const handleMailSent = () => {
                setTimeout(() => loadInbox(false), 500);
            };
            window.addEventListener("mailSent", handleMailSent);
            
            return () => {
                clearInterval(interval);
                window.removeEventListener("mailSent", handleMailSent);
            };
        }
    }, [user]);

    const filteredMails = useMemo(() => {
        if (!searchTerm) return mails;
        const lowerTerm = searchTerm.toLowerCase();
        return mails.filter(
            (mail) =>
                mail.subject?.toLowerCase().includes(lowerTerm) ||
                mail.body?.toLowerCase().includes(lowerTerm) ||
                mail.from?.toLowerCase().includes(lowerTerm)
        );
    }, [mails, searchTerm]);

    useEffect(() => {
        if (selectedMail && !filteredMails.find((m) => m._id === selectedMail._id)) {
            setSelectedMail(null);
        }
    }, [filteredMails, selectedMail]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg border border-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full animate-float"></div>
                    <div className="absolute bottom-10 right-10 w-16 h-16 bg-purple-200 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
                </div>
                <div className="text-center z-10">
                    <div className="text-4xl mb-4 animate-bounce">📧</div>
                    <p className="text-gray-600 font-medium animate-pulse">Loading your inbox...</p>
                    <div className="flex justify-center mt-4 space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex h-[calc(100vh-60px)] bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-5">
                    <div className="absolute top-20 left-20 w-64 h-64 bg-blue-200 rounded-full animate-float"></div>
                    <div className="absolute bottom-20 right-20 w-48 h-48 bg-purple-200 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
                </div>
                {/* Mail List - Always visible on mobile/tablet, hidden on large desktop when mail is selected */}
                <div className={`${selectedMail ? "hidden lg:block lg:w-80 xl:w-96" : "w-full lg:w-80 xl:w-96"} transition-all duration-300 flex-shrink-0`}>
                    <div className="p-4 h-full overflow-y-auto border-r border-gray-200 bg-white/90 backdrop-blur-sm shadow-lg">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2 border-b pb-2 animate-slide-in-left">
                            <span className="text-blue-600 text-2xl animate-float">📥</span>{" "}
                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {searchTerm ? `Search Results (${filteredMails.length})` : `Inbox (${filteredMails.length})`}
                            </span>
                            {unreadCount > 0 && !searchTerm && (
                                <span className="ml-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold animate-bounce shadow-lg">
                                    {unreadCount}
                                </span>
                            )}
                        </h2>
                        {filteredMails.length === 0 ? (
                            <div className="text-center mt-10 animate-fade-in-up">
                                <div className="text-4xl mb-4 opacity-50">📭</div>
                                <p className="text-gray-500 text-sm">
                                    {searchTerm ? `No results for "${searchTerm}".` : "No inbox mails found."}
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {filteredMails.map((mail, index) => (
                                    <li
                                        key={mail._id}
                                        className={`p-3 flex items-start gap-3 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                                            selectedMail?._id === mail._id
                                                ? "bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-600 shadow-lg transform scale-[1.02]"
                                                : mail.isRead
                                                    ? "bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 border border-transparent hover:border-blue-200"
                                                    : "bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border border-blue-200 shadow-sm"
                                            }`}
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                        onClick={() => {
                                            if (!mail.isRead) markAsRead(mail._id);
                                            setSelectedMail(mail);
                                            resetReplyState();
                                        }}
                                    >
                                        {/* 1. MAIL LIST ITEM AVATAR: DP or Initial */}
                                        <UserAvatar email={mail.from} dp={mail.fromDp} size={45} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm ${mail.isRead ? "text-gray-800 font-medium" : "text-gray-900 font-bold"} truncate`}>
                                                    {mail.from || "Unknown"}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {!mail.isRead && (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                    )}
                                                    <p className="text-xs text-gray-500 min-w-max">{mail.timestamp ? formatDate(mail.timestamp) : ""}</p>
                                                </div>
                                            </div>
                                            <p className={`text-sm truncate mt-1 ${mail.isRead ? "text-gray-600 font-normal" : "text-blue-700 font-bold"}`}>
                                                {mail.subject || "No subject"}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate mt-1">{mail.body?.substring(0, 60) || "No content"}</p>
                                            {mail.attachments?.length > 0 && (
                                                <div className="flex items-center mt-1">
                                                    <span className="text-xs text-blue-600">📎 {mail.attachments.length}</span>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                {/* Mail View - Hidden on mobile/tablet when no mail selected, shown on large desktop */}
                <div className={`${selectedMail ? "w-full lg:flex-1" : "hidden lg:block lg:flex-1"} transition-all duration-300`}>
                    {selectedMail ? (
                        <div className="flex-1 p-4 lg:p-6 h-full overflow-y-auto bg-transparent">
                            <div className="bg-white/90 backdrop-blur-sm p-4 lg:p-6 rounded-xl shadow-xl border border-gray-200 animate-fade-in-up">
                                {/* Back button for mobile/tablet */}
                                <button
                                    onClick={() => setSelectedMail(null)}
                                    className="lg:hidden mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                >
                                    <span className="text-xl">←</span>
                                    <span>Back to Inbox</span>
                                </button>
                                
                                <div className="border-b pb-4 mb-4 flex justify-between items-start animate-slide-in-right">
                                    <div className="flex items-start gap-4">
                                        {/* 2. SELECTED MAIL AVATAR: DP or Initial (Larger size) */}
                                        <UserAvatar email={selectedMail.from} dp={selectedMail.fromDp} size={56} />
                                        
                                        <div>
                                            <h3 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-1">
                                                {selectedMail.subject || "No Subject"}
                                            </h3>
                                            <p className="text-sm text-gray-500">From: <span className="text-blue-600 font-medium">{selectedMail.from || "Unknown"}</span></p>
                                            <p className="text-xs text-gray-400 mt-1">{formatDate(selectedMail.timestamp)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => { setReplyMode("reply"); setShowReplyBox(true); }} title="Reply"
                                            className="text-gray-500 hover:text-blue-600 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-blue-50">
                                            ↩️
                                        </button>
                                        <button onClick={() => { setReplyMode("reply-all"); setShowReplyBox(true); }} title="Reply All"
                                            className="text-gray-500 hover:text-green-600 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-green-50">
                                            ↪️
                                        </button>
                                        <button onClick={() => { setReplyMode("forward"); setShowReplyBox(true); }} title="Forward"
                                            className="text-gray-500 hover:text-purple-600 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-purple-50">
                                            ⤴️
                                        </button>
                                        <button onClick={() => handleSaveMail(selectedMail._id)} title="Save Mail"
                                            className="text-gray-500 hover:text-blue-600 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-blue-50">
                                            💾
                                        </button>
                                        <button onClick={() => handleDeleteMail(selectedMail._id)} title="Delete Mail"
                                            className="text-gray-500 hover:text-red-500 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-red-50">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <div className="animate-fade-in-up">
                                    <p className="whitespace-pre-line my-4 text-gray-800 leading-relaxed">{selectedMail.body || "No content"}</p>
                                </div>
                                {selectedMail.attachments?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t animate-fade-in-up">
                                        <p className="text-gray-700 mb-3 font-semibold text-sm flex items-center gap-2">
                                            <span className="text-lg">📎</span> Attachments ({selectedMail.attachments.length})
                                        </p>
                                        <div className="flex gap-3 flex-wrap">
                                            {selectedMail.attachments.map((file, idx) => (
                                                <a
                                                    key={`${file}-${idx}`}
                                                    href={`${api.defaults.baseURL || ""}${file}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200 rounded-full text-blue-600 text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-md"
                                                >
                                                    {file.split("/").pop()}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedMail.replies?.length > 0 && (
                                    <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg max-h-60 overflow-y-auto border border-gray-200 animate-fade-in-up">
                                        <h4 className="font-bold mb-3 text-gray-800 text-sm flex items-center gap-2">
                                            <span className="text-lg">💬</span> Conversation History ({selectedMail.replies.length})
                                        </h4>
                                        <div className="space-y-3">
                                            {selectedMail.replies.map((reply, index) => (
                                                <div
                                                    key={reply._id || index}
                                                    className={`p-3 rounded-lg transition-all duration-200 hover:shadow-md ${
                                                        reply.from === selectedMail.from
                                                            ? "bg-white border border-gray-200"
                                                            : "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200"
                                                        }`}
                                                    style={{ animationDelay: `${index * 0.1}s` }}
                                                >
                                                    <p className="text-sm text-gray-600 mb-1">
                                                        <strong className="text-gray-800">{reply.from || "Unknown"}</strong>
                                                        <span className="text-gray-400 text-xs ml-2">{formatDate(reply.timestamp)}</span>
                                                    </p>
                                                    <p className="text-gray-800 mt-1 whitespace-pre-line leading-relaxed">{reply.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {showReplyBox && (
                                    <div className="mt-6 p-4 bg-gradient-to-br from-gray-100 to-blue-50 rounded-xl border border-gray-200 animate-fade-in-up">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                                <span className="text-lg">
                                                    {replyMode === "reply" ? "↩️" : replyMode === "reply-all" ? "↪️" : "⤴️"}
                                                </span>
                                                {replyMode === "reply" ? "Reply" : replyMode === "reply-all" ? "Reply All" : "Forward"}
                                            </h4>
                                            <button
                                                onClick={() => setShowReplyBox(false)}
                                                className="text-gray-500 hover:text-gray-700 hover:scale-110 transition-all duration-200 p-1 rounded"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200 text-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-gray-600 font-medium">To:</span>
                                                <span className="text-blue-600">
                                                    {replyMode === "forward" ? "Enter recipient email" : selectedMail?.from || "Unknown"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-gray-600 font-medium">Subject:</span>
                                                <span className="text-gray-800">
                                                    {replyMode === "reply" ? `Re: ${selectedMail?.subject || "No Subject"}` :
                                                        replyMode === "reply-all" ? `Re: ${selectedMail?.subject || "No Subject"}` :
                                                            `Fwd: ${selectedMail?.subject || "No Subject"}`}
                                                </span>
                                            </div>
                                        </div>

                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            className="w-full p-3 rounded-lg text-gray-800 mb-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                                            placeholder={
                                                replyMode === "forward"
                                                    ? "Add a message to forward with this email..."
                                                    : "Write your reply..."
                                            }
                                            rows={4}
                                        />

                                        {replyMode !== "forward" && (
                                            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                                                <div className="text-gray-600 mb-2 font-medium">Original Message:</div>
                                                <div className="text-gray-700 max-h-20 overflow-y-auto">
                                                    {selectedMail?.body?.substring(0, 200) || "No content"}
                                                    {selectedMail?.body?.length > 200 && "..."}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleReplyFileChange}
                                                className="file:mr-3 file:py-2 file:px-4 file:rounded-full file:bg-gradient-to-r file:from-blue-600 file:to-purple-600 file:text-white hover:file:from-blue-700 hover:file:to-purple-700 cursor-pointer transition-all duration-200"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowReplyBox(false)}
                                                    className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleReply}
                                                    disabled={replyLoading}
                                                    className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-2 rounded-xl text-white font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg ${replyLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                                                >
                                                    {replyLoading ? (
                                                        <span className="flex items-center gap-2">
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            Sending...
                                                        </span>
                                                    ) : (
                                                        replyMode === "forward" ? "Forward" : "Send Reply"
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-center p-6 animate-fade-in-up">
                            <div>
                                {filteredMails.length > 0 ? (
                                    <>
                                        <div className="text-6xl mb-4 opacity-50">📬</div>
                                        <p className="text-lg font-medium">Select a mail from the left to read it</p>
                                        <p className="text-sm mt-2 opacity-75">Click on any email to view its contents</p>
                                    </>
                                ) : searchTerm ? (
                                    <>
                                        <div className="text-6xl mb-4 opacity-50">🔍</div>
                                        <p className="text-lg font-medium">No results found for your search</p>
                                        <p className="text-sm mt-2 opacity-75">Try different keywords or check your spelling</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-6xl mb-4 opacity-50 animate-float">🏖️</div>
                                        <p className="text-lg font-medium">Your inbox is empty</p>
                                        <p className="text-sm mt-2 opacity-75">Time to relax! No new emails to worry about</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Toast message={feedback} />
        </>
    );
}