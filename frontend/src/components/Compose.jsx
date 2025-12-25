
// src/components/Compose.jsx
import React, { useState, useRef, useEffect } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";

export default function Compose() {
  const { user } = useAuth();

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);

  const [draftId, setDraftId] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fileInputRef = useRef(null);
  const feedbackTimer = useRef(null);
  const autoSaveTimer = useRef(null);

  /* =========================
     🔔 Handle ALBot events (draft load)
  ========================= */
  useEffect(() => {
    const handleALBotCompose = (e) => {
      const { to: alTo, subject: alSub, body: alBody, draftId: alDraftId, close } = e.detail || {};
      if (close) return resetForm();

      if (alTo !== undefined) setTo(alTo || "");
      if (alSub !== undefined) setSubject(alSub || "");
      if (alBody !== undefined) setBody(alBody || "");
      if (alDraftId) setDraftId(alDraftId);

      if (alTo || alSub || alBody || alDraftId) showFeedback("💡 Draft loaded");
    };

    window.addEventListener("albot:compose", handleALBotCompose);
    return () => window.removeEventListener("albot:compose", handleALBotCompose);
  }, []);

  /* =========================
     📎 Handle file changes
  ========================= */
  const handleFileChange = (e) => {
    setAttachments(Array.from(e.target.files || []));
  };

  /* =========================
     📝 Feedback helper
  ========================= */
  const showFeedback = (msg) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback(msg);
    feedbackTimer.current = setTimeout(() => setFeedback(""), 4000);
  };

  /* =========================
     🔄 Reset form
  ========================= */
  const resetForm = () => {
    setTo("");
    setSubject("");
    setBody("");
    setAttachments([]);
    setDraftId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* =========================
     💾 Auto-save draft
  ========================= */
  const autoSaveDraft = async () => {
    let token = user?.accessToken;
    const storedUser = localStorage.getItem("xmailUser");
    if (!token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        token = parsed?.accessToken;
      } catch {}
    }
    if (!token) return;
    if (!to && !subject && !body && attachments.length === 0) return;

    try {
      setSavingDraft(true);
      if (!draftId) {
        const res = await api.post(
          "/drafts",
          { to, subject, body, attachments: attachments.map(f => f.name) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?._id) setDraftId(res.data._id);
      } else {
        await api.put(
          `/drafts/${draftId}`,
          { to, subject, body, attachments: attachments.map(f => f.name) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err) {
      console.error("Draft auto-save error:", err);
    } finally {
      setSavingDraft(false);
    }
  };

  /* =========================
     ⏱️ Debounce auto-save
  ========================= */
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(autoSaveDraft, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [to, subject, body, attachments]);

  /* =========================
     🤖 AI Suggest
  ========================= */
  const handleAISuggest = async () => {
    if (!subject.trim()) return showFeedback("⚠️ Enter a subject first.");
    if (!user?.accessToken) return showFeedback("❌ Login required.");

    try {
      setAiLoading(true);
      showFeedback("🤖 Generating AI suggestion...");

      const res = await api.post(
        "/ai/generate",
        { prompt: subject.trim() },
        { headers: { Authorization: `Bearer ${user.accessToken}` } }
      );

      if (res.data?.success && res.data?.body) {
        setBody(prev => prev.trim() ? `${prev.trim()}\n\n---\n\n${res.data.body}` : res.data.body);
        showFeedback("✅ AI suggestion added.");
      } else {
        showFeedback("❌ AI returned empty response.");
      }
    } catch (err) {
      console.error("AI Error:", err);
      showFeedback("❌ AI generation failed.");
    } finally {
      setAiLoading(false);
    }
  };

  /* =========================
     📩 Send Mail
  ========================= */
  const handleSend = async (e) => {
    e.preventDefault();

    const trimmedTo = to.trim().toLowerCase();
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();

    if (!trimmedTo || !trimmedSubject || !trimmedBody) return showFeedback("⚠️ Fill all fields.");
    const emailRegex = /^[a-zA-Z0-9._%+-]+@xmail\.com$/;
    if (!emailRegex.test(trimmedTo)) return showFeedback("⚠️ Invalid Xmail address.");
    if (!user?.accessToken) return showFeedback("❌ Login required.");

    try {
      setLoading(true);
      setFeedback("");

      const formData = new FormData();
      formData.append("to", trimmedTo);
      formData.append("subject", trimmedSubject);
      formData.append("body", trimmedBody);
      attachments.forEach(f => formData.append("attachments", f));

      const response = await api.post("/mail/compose", formData, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.success) {
        showFeedback("📩 Mail sent successfully!");
        resetForm();
        window.dispatchEvent(new CustomEvent("mailSent"));
      } else {
        showFeedback(response.data?.message || "❌ Failed to send mail.");
      }
    } catch (err) {
      console.error("Send Error:", err);
      const errorMsg = err.response?.data?.message || err.message || "❌ Failed to send mail.";
      showFeedback(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     🧾 UI
  ========================= */
  return (
    <div className="w-full h-[calc(100vh-60px)] overflow-y-auto bg-gray-50">
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          {/* Header */}
          <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span>✍️</span> Compose New Mail
            </h2>
            {savingDraft && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden md:inline">Saving draft...</span>
                <span className="md:hidden">💾</span>
              </div>
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`mx-4 md:mx-6 lg:mx-8 mt-4 p-3 rounded-lg text-sm text-center font-medium ${
              feedback.includes("❌") || feedback.includes("⚠️")
                ? "bg-red-50 text-red-700 border border-red-200"
                : feedback.includes("✅") || feedback.includes("📩")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}>
              {feedback}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSend} className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
              <input type="email" value={to} onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@xmail.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm md:text-base bg-white" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this email about?"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm md:text-base bg-white" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)}
                rows={12} placeholder="Write your message here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm md:text-base bg-white min-h-[250px]" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Attachments</label>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input type="file" multiple ref={fileInputRef} onChange={handleFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer text-xs md:text-sm w-full sm:w-auto" />
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 flex-1">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg text-blue-700 text-xs md:text-sm font-medium border border-blue-200">
                        <span>📎</span>
                        <span className="truncate max-w-[150px] md:max-w-[200px]">{file.name}</span>
                        <button type="button" onClick={() => {
                          const newFiles = attachments.filter((_, i) => i !== idx);
                          setAttachments(newFiles);
                          if (fileInputRef.current) {
                            const dt = new DataTransfer();
                            newFiles.forEach(f => dt.items.add(f));
                            fileInputRef.current.files = dt.files;
                          }
                        }} className="ml-1 text-red-600 hover:text-red-800 font-bold">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-gray-200">
  <button
    type="button"
    onClick={handleAISuggest}
    disabled={aiLoading || !subject.trim()}
    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm md:text-base transition-all ${
      aiLoading || !subject.trim()
        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
        : "bg-black text-white hover:bg-gray-900 shadow hover:shadow-md"
    }`}
  >
    {aiLoading ? (
      <>
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Generating...</span>
      </>
    ) : (
      <>
        <span>🤖</span>
        <span>AI Suggest</span>
      </>
    )}
  </button>

  <button
    type="submit"
    disabled={loading || !to.trim() || !subject.trim() || !body.trim()}
    className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm md:text-base transition-all ${
      loading || !to.trim() || !subject.trim() || !body.trim()
        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
        : "bg-black text-white hover:bg-gray-900 shadow hover:shadow-md"
    }`}
  >
    {loading ? (
      <>
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Sending...</span>
      </>
    ) : (
      <>
        <span>📩</span>
        <span>Send Mail</span>
      </>
    )}
  </button>
</div>

          </form>
        </div>
      </div>
    </div>
  );
}


