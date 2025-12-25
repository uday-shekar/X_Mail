import React, { useEffect, useState, useMemo } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";
import UserAvatar from "./UserAvatar";

const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    // Use a simpler format for the list view
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Helper function to extract and format recipients for Reply/Forward
const getInitialRecipients = (mail, userEmail, mode) => {
    const originalTo = mail.to || "";
    const originalCc = mail.cc || "";
    
    // For Sent mail, 'mail.to' is the original recipient(s).
    // The current user's email (userEmail) is mail.from.

    if (mode === "reply") {
        // Reply goes only to the primary recipient(s) of the original mail.
        // If there are multiple 'to' addresses, reply goes to all of them.
        return { to: originalTo, cc: "", bcc: "" };
    } else if (mode === "reply-all") {
        // Reply-all goes to original 'to' and 'cc' list, excluding the current user.
        const allRecipients = `${originalTo},${originalCc}`
            .split(',')
            .map(email => email.trim())
            .filter(email => email && email !== userEmail);

        // Simple approach: Put all unique non-user emails back into 'to' for the new mail.
        return { to: allRecipients.join(', '), cc: "", bcc: "" };
    } else if (mode === "forward") {
        // Forward starts with empty recipients.
        return { to: "", cc: "", bcc: "" };
    }
    return { to: "", cc: "", bcc: "" };
};

export default function Sent({ searchTerm = "" }) {
    const { user } = useAuth();
    const [mails, setMails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMail, setSelectedMail] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [replyFiles, setReplyFiles] = useState([]);
    const [feedback, setFeedback] = useState("");
    const [replyLoading, setReplyLoading] = useState(false);
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [replyMode, setReplyMode] = useState("reply"); // reply, reply-all, forward

    // FIX 1: Added state for reply recipients to allow user input/override
    const [replyTo, setReplyTo] = useState("");
    const [replyCc, setReplyCc] = useState("");
    const [replyBcc, setReplyBcc] = useState("");

    // NOTE: The original component had a call to markAsRead, which is not defined.
    // I'm defining a placeholder function for it to prevent errors in the list item's onClick.
    const markAsRead = async (mailId) => {
        // Implement API call to mark as read if necessary for your backend
        console.log(`Placeholder: Marking mail ${mailId} as read (though it's a sent mail).`);
    };

    // Fetch sent mails
    const fetchSent = async () => {
        if (!user?.accessToken) {
            setFeedback("❌ Please log in to view sent mails.");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const res = await api.get("/mail/sent", {
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
            console.error("❌ Error fetching sent mails:", err);
            setFeedback("❌ An error occurred while fetching sent mails.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSent();
        
        // Listen for mail sent events to refresh the list
        const handleMailSent = () => {
            setTimeout(() => fetchSent(), 500); // Small delay to ensure backend has saved
        };
        window.addEventListener("mailSent", handleMailSent);
        
        return () => {
            window.removeEventListener("mailSent", handleMailSent);
        };
    }, [user]);

    // Handle setting up the reply box state when a mail is selected and a mode is chosen
    const setupReplyBox = (mail, mode) => {
        const recipients = getInitialRecipients(mail, user.email, mode);
        setReplyTo(recipients.to);
        setReplyCc(recipients.cc);
        setReplyBcc(recipients.bcc);
        setReplyMode(mode);
        setShowReplyBox(true);
        setReplyText("");
    };

    // Handle reply files
    const handleReplyFileChange = (e) => setReplyFiles([...e.target.files]);

    // 📧 Format reply text like real email
    const formatReplyText = (originalText, replyText, mode) => {
        const separator = "\n\n" + "─".repeat(50) + "\n";

        if (mode === "forward") {
            return `${replyText}\n\n${separator}---------- Forwarded message ---------\nFrom: ${selectedMail?.from}\nTo: ${selectedMail?.to}\nDate: ${formatDate(selectedMail?.timestamp)}\nSubject: ${selectedMail?.subject}\n\n${originalText}`;
        } else {
            // For reply/reply-all
            return `${replyText}\n\n${separator}\nOn ${formatDate(selectedMail?.timestamp)}, ${selectedMail?.to} wrote:\n\n${originalText}`;
        }
    };

    // 🔄 Reset reply state
    const resetReplyState = () => {
        setReplyText("");
        setReplyFiles([]);
        setShowReplyBox(false);
        setReplyMode("reply");
        // FIX 2: Reset reply recipient states
        setReplyTo("");
        setReplyCc("");
        setReplyBcc("");
    };

    // Send reply
    const handleReply = async () => {
        if (!selectedMail?._id) return setFeedback("⚠️ Please select a mail to reply.");
        if (!replyText.trim() && replyFiles.length === 0)
            return setFeedback("⚠️ Write a reply or attach a file.");
        if (!user?.accessToken) return setFeedback("❌ Please log in to send a reply.");
        // Check if 'To' is empty for non-forward modes, or if it's empty for forward mode after the user should have typed it.
        if (replyTo.trim().length === 0)
            return setFeedback("⚠️ Recipient 'To' field cannot be empty.");

        setReplyLoading(true);
        setFeedback("");

        try {
            const formData = new FormData();
            
            // Send only the reply text, not the formatted text with "On content"
            // The backend will create a new mail with just the reply text
            formData.append("replyText", replyText.trim());
            formData.append("replyMode", replyMode);
            formData.append("to", replyTo.trim());
            formData.append("subject", 
                replyMode === "reply" || replyMode === "reply-all" 
                ? `Re: ${selectedMail.subject || "(No Subject)"}` 
                : `Fwd: ${selectedMail.subject || "(No Subject)"}`
            );
            if (replyCc.trim()) formData.append("cc", replyCc.trim());
            if (replyBcc.trim()) formData.append("bcc", replyBcc.trim());
            
            // Add attachments
            replyFiles.forEach((file) => formData.append("attachments", file));

            // Assuming the backend handles the reply logic (threading, sending from user.email)
            const res = await api.post(`/mail/reply/${selectedMail._id}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${user.accessToken}`,
                },
            });

            if (res.data.success || res.data.reply) {
                const actionText = replyMode === "forward" ? "Forwarded" : replyMode === "reply-all" ? "Replied to all" : "Replied";
                setFeedback(`✅ ${actionText} successfully!`);
                resetReplyState();
                // Optimistically update the selected mail's replies array
                setSelectedMail((prev) => ({
                    ...prev,
                    replies: [...(prev?.replies || []), res.data.reply],
                }));
                // Re-fetch to update the main list if necessary
                fetchSent();
            } else {
                setFeedback(res.data.message || "❌ Error sending the reply.");
            }
        } catch (err) {
            console.error("❌ Reply error:", err);
            setFeedback("❌ A server error occurred while sending the reply.");
        } finally {
            setReplyLoading(false);
        }
    };

    // Move mail to trash
    const handleDeleteMail = async (mailId) => {
        if (!user?.accessToken) return;
        try {
            await api.put(
                `/mail/trash/${mailId}`,
                {},
                { headers: { Authorization: `Bearer ${user.accessToken}` } }
            );
            setFeedback("🗑️ Mail moved to trash.");
            setSelectedMail(null);
            fetchSent();
        } catch (err) {
            console.error("❌ Delete error:", err);
            setFeedback("❌ A server error occurred while moving the mail to trash.");
        }
    };

    // Save mail
    const handleSaveMail = async (mailId) => {
        if (!user?.accessToken) return;
        try {
            await api.put(`/mail/save/${mailId}`, {}, {
                headers: { Authorization: `Bearer ${user.accessToken}` },
            });
            setFeedback("💾 Mail saved successfully.");
            fetchSent();
        } catch (err) {
            console.error("❌ Save error:", err);
            setFeedback("❌ Server error while saving mail.");
        }
    };

    // Filter mails by search term
    const filteredMails = useMemo(() => {
        if (!searchTerm) return mails;
        const term = searchTerm.toLowerCase();
        return mails.filter(
            (mail) =>
                mail.to?.toLowerCase().includes(term) ||
                mail.subject?.toLowerCase().includes(term) ||
                mail.body?.toLowerCase().includes(term)
        );
    }, [mails, searchTerm]);

    // Deselect mail if filtered out
    useEffect(() => {
        if (selectedMail && !filteredMails.find((m) => m._id === selectedMail._id))
            setSelectedMail(null);
    }, [filteredMails, selectedMail]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg border border-gray-200 relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 left-10 w-20 h-20 bg-green-200 rounded-full animate-float"></div>
                    <div className="absolute bottom-10 right-10 w-16 h-16 bg-emerald-200 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
                </div>
                
                <div className="text-center z-10">
                    <div className="text-4xl mb-4 animate-bounce">📤</div>
                    <p className="text-gray-600 font-medium animate-pulse">Loading your sent emails...</p>
                    <div className="flex justify-center mt-4 space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-60px)] bg-gradient-to-br from-gray-50 to-green-50 relative overflow-hidden">
            {/* Feedback Message */}
            {feedback && (
                <div 
                    className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 p-3 rounded-lg shadow-xl text-sm font-medium transition-all duration-300 animate-slide-in-down"
                    style={{backgroundColor: feedback.startsWith('✅') ? 'rgb(220, 252, 231)' : 'rgb(254, 226, 226)', color: feedback.startsWith('✅') ? 'rgb(5, 150, 105)' : 'rgb(185, 28, 28)'}}
                >
                    {feedback}
                </div>
            )}
            
            {/* Background decorative elements */}
            <div className="absolute inset-0 pointer-events-none opacity-5">
                <div className="absolute top-20 left-20 w-64 h-64 bg-green-200 rounded-full animate-float"></div>
                <div className="absolute bottom-20 right-20 w-48 h-48 bg-emerald-200 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
            </div>

            {/* Sidebar - Always visible on mobile/tablet, hidden on large desktop when mail is selected */}
            <div className={`${selectedMail ? "hidden lg:block lg:w-80 xl:w-96" : "w-full lg:w-80 xl:w-96"} transition-all duration-300 flex-shrink-0`}>
                <div className="p-4 h-full overflow-y-auto border-r border-gray-200 bg-white/90 backdrop-blur-sm shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2 border-b pb-2 animate-slide-in-left">
                        <span className="text-green-600 text-2xl animate-float">📤</span>{" "}
                        <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {searchTerm ? `Search Results (${filteredMails.length})` : `Sent (${filteredMails.length})`}
                        </span>
                    </h2>

                    {filteredMails.length === 0 ? (
                        <div className="text-center mt-10 animate-fade-in-up">
                            <div className="text-4xl mb-4 opacity-50">📭</div>
                            <p className="text-gray-500 text-sm">
                                {searchTerm ? `No results for "${searchTerm}".` : "No sent emails found."}
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {filteredMails.map((mail, index) => (
                                <li
                                    key={mail._id}
                                    className={`p-3 flex items-start gap-3 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                                        selectedMail?._id === mail._id
                                            ? "bg-gradient-to-r from-green-100 to-emerald-100 border-l-4 border-green-600 shadow-lg transform scale-[1.02]"
                                            : "bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50 border border-transparent hover:border-green-200"
                                    }`}
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                    onClick={() => {
                                        if (!mail.isRead) markAsRead(mail._id);
                                        setSelectedMail(mail);
                                        resetReplyState();
                                    }}
                                >
                                    {/* FIX: Showing RECIPIENT's DP (mail.to) in the Sent folder list */}
                                    <UserAvatar email={mail.to} dp={mail.toDp} size={45} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p
                                                className={`text-sm font-medium truncate ${
                                                    mail._id === selectedMail?._id ? "text-green-600" : "text-gray-800"
                                                }`}
                                            >
                                                {/* Displaying 'To' address as the main contact in Sent list */}
                                                {mail.to || "Unknown"} 
                                            </p>
                                            <p className="text-xs text-gray-500 min-w-max">{formatDate(mail.timestamp)}</p>
                                        </div>
                                        <p
                                            className={`text-sm truncate mt-1 ${
                                                mail._id === selectedMail?._id
                                                    ? "text-green-700 font-semibold"
                                                    : "text-gray-900 font-medium"
                                            }`}
                                        >
                                            {mail.subject || "(No Subject)"}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate mt-1">
                                            {mail.body?.substring(0, 60) || "(No Content)"}
                                        </p>
                                        {mail.attachments?.length > 0 && (
                                            <div className="flex items-center mt-1">
                                                <span className="text-xs text-green-600">📎 {mail.attachments.length}</span>
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
                                className="lg:hidden mb-4 flex items-center gap-2 text-green-600 hover:text-green-800 font-medium transition-colors"
                            >
                                <span className="text-xl">←</span>
                                <span>Back to Sent</span>
                            </button>
                            
                            {/* Header */}
                            <div className="border-b pb-4 mb-4 flex justify-between items-start animate-slide-in-right">
                                <div className="flex items-start gap-4">
                                    {/* Full view also correctly shows the TO's DP */}
                                    <UserAvatar email={selectedMail.to} dp={selectedMail.toDp} size={56} />
                                    <div>
                                        <h3 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 to-green-800 bg-clip-text text-transparent mb-1">
                                            {selectedMail.subject || "(No Subject)"}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            To: <span className="text-green-600 font-medium">{selectedMail.to}</span>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">{formatDate(selectedMail.timestamp)}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button 
                                        onClick={() => setupReplyBox(selectedMail, "reply")} 
                                        title="Reply" 
                                        className="text-gray-500 hover:text-green-600 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-green-50"
                                    >
                                        ↩️
                                    </button>
                                    <button 
                                        onClick={() => setupReplyBox(selectedMail, "reply-all")} 
                                        title="Reply All" 
                                        className="text-gray-500 hover:text-blue-600 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-blue-50"
                                    >
                                        ↪️
                                    </button>
                                    <button 
                                        onClick={() => setupReplyBox(selectedMail, "forward")} 
                                        title="Forward" 
                                        className="text-gray-500 hover:text-purple-600 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-purple-50"
                                    >
                                        ⤴️
                                    </button>
                                    <button
                                        onClick={() => handleSaveMail(selectedMail._id)}
                                        className="text-gray-500 hover:text-green-600 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-green-50"
                                        title="Save mail"
                                    >
                                        💾
                                    </button>
                                    <button
                                        onClick={() => handleDeleteMail(selectedMail._id)}
                                        className="text-gray-500 hover:text-red-500 hover:scale-110 transition-all duration-200 p-2 rounded-lg hover:bg-red-50"
                                        title="Move mail to trash"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="animate-fade-in-up">
                                <p className="whitespace-pre-line my-4 text-gray-800 leading-relaxed">{selectedMail.body || "(No Content)"}</p>
                            </div>

                            {/* Attachments */}
                            {selectedMail.attachments?.length > 0 && (
                                <div className="mt-4 pt-4 border-t animate-fade-in-up">
                                    <p className="text-gray-700 mb-3 font-semibold text-sm flex items-center gap-2">
                                        <span className="text-lg">📎</span> Attachments ({selectedMail.attachments.length})
                                    </p>
                                    <div className="flex gap-3 flex-wrap">
                                        {selectedMail.attachments.map((file, idx) => (
                                            <a
                                                key={idx}
                                                // Assuming file path is relative and needs the base URL
                                                href={`${api.defaults.baseURL || "http://localhost:5000"}${file}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 rounded-full text-green-600 text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-md"
                                            >
                                                {file.split("/").pop()}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Replies */}
                            {selectedMail.replies?.length > 0 && (
                                <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-green-50 rounded-lg max-h-60 overflow-y-auto border border-gray-200 animate-fade-in-up">
                                    <h4 className="font-bold mb-3 text-gray-800 text-sm flex items-center gap-2">
                                        <span className="text-lg">💬</span> Conversation History ({selectedMail.replies.length})
                                    </h4>
                                    <div className="space-y-3">
                                        {selectedMail.replies.map((reply, index) => (
                                            <div
                                                key={reply._id || index}
                                                className={`p-3 rounded-lg transition-all duration-200 hover:shadow-md ${
                                                    // Replies are from either the recipient (mail.to) or the current user (selectedMail.from)
                                                    reply.from === selectedMail.to 
                                                        ? "bg-white border border-gray-200" // Recipient's reply
                                                        : "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200" // Sender's reply
                                                }`}
                                                style={{animationDelay: `${index * 0.1}s`}}
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

                            {/* Reply Box */}
                            {showReplyBox && (
                                <div className="mt-6 p-4 bg-gradient-to-br from-gray-100 to-green-50 rounded-xl border border-gray-200 animate-fade-in-up">
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

                                    {/* FIX 4: Email Header Input Fields */}
                                    <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200 text-sm space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600 font-medium w-12 flex-shrink-0">To:</span>
                                            <input 
                                                type="text"
                                                value={replyTo}
                                                onChange={(e) => setReplyTo(e.target.value)}
                                                className="w-full p-1 border-b border-gray-300 focus:border-green-500 outline-none text-green-600"
                                                placeholder={replyMode === "forward" ? "Enter recipient email(s)" : "Recipient email(s)"}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600 font-medium w-12 flex-shrink-0">Cc:</span>
                                            <input 
                                                type="text"
                                                value={replyCc}
                                                onChange={(e) => setReplyCc(e.target.value)}
                                                className="w-full p-1 border-b border-gray-300 focus:border-green-500 outline-none text-gray-600"
                                                placeholder="Cc email(s) (optional)"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600 font-medium w-12 flex-shrink-0">Bcc:</span>
                                            <input 
                                                type="text"
                                                value={replyBcc}
                                                onChange={(e) => setReplyBcc(e.target.value)}
                                                className="w-full p-1 border-b border-gray-300 focus:border-green-500 outline-none text-gray-600"
                                                placeholder="Bcc email(s) (optional)"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 pt-1 border-t mt-2">
                                            <span className="text-gray-600 font-medium w-12 flex-shrink-0">Subject:</span>
                                            <span className="text-gray-800">
                                                {replyMode === "reply" || replyMode === "reply-all" ? `Re: ${selectedMail?.subject || "No Subject"}` : `Fwd: ${selectedMail?.subject || "No Subject"}`}
                                            </span>
                                        </div>
                                    </div>

                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        className="w-full p-3 rounded-lg text-gray-800 mb-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 resize-none"
                                        placeholder={
                                            replyMode === "forward" 
                                                ? "Add a message to forward with this email..." 
                                                : "Write your reply..."
                                        }
                                        rows={4}
                                    />

                                    {/* Original Message Preview */}
                                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                                        <div className="text-gray-600 mb-2 font-medium">Original Message:</div>
                                        <div className="text-gray-700 max-h-20 overflow-y-auto">
                                            {selectedMail?.body?.substring(0, 200) || "No content"}
                                            {selectedMail?.body?.length > 200 && "..."}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleReplyFileChange}
                                            className="file:mr-3 file:py-2 file:px-4 file:rounded-full file:bg-gradient-to-r file:from-green-600 file:to-emerald-600 file:text-white hover:file:from-green-700 hover:file:to-emerald-700 cursor-pointer transition-all duration-200"
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
                                                className={`bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6 py-2 rounded-xl text-white font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg ${replyLoading ? "opacity-50 cursor-not-allowed" : ""}`}
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
                                    <p className="text-lg font-medium">Select an email from the left to read it</p>
                                    <p className="text-sm mt-2 opacity-75">Click on any sent email to view its contents</p>
                                </>
                            ) : (
                                // This path is actually covered by the sidebar message when filteredMails.length is 0, but this is a fallback for the main view.
                                <div className="text-center mt-10">
                                    <div className="text-6xl mb-4 opacity-50">📭</div>
                                    <p className="text-gray-500 text-lg">No sent email selected.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}