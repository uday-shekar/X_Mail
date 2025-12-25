import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";

export default function Drafts() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState(null);

  /* =========================================
     📥 FETCH DRAFTS
  ========================================= */
  const fetchDrafts = async () => {
    if (!user?.accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get("/drafts");

      // ✅ Backend returns array directly, not wrapped in drafts property
      setDrafts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("❌ Draft fetch error:", err);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.accessToken) {
      fetchDrafts();
    } else {
      setLoading(false);
    }
  }, [user?.accessToken]);

  /* =========================================
     🗑️ MOVE DRAFT TO DELETED
  ========================================= */
  const deleteDraft = async (id) => {
    if (!window.confirm("Move this draft to deleted?")) return;

    try {
      // Move draft to deleted folder instead of deleting
      await api.put(`/mail/trash/${id}`);

      setDrafts((prev) => prev.filter((d) => d._id !== id));

      if (selectedDraft?._id === id) {
        setSelectedDraft(null);
      }
    } catch (err) {
      console.error("❌ Draft delete error:", err);
    }
  };

  /* =========================================
     ✍️ CONTINUE EDITING - Navigate to Compose with Latest Data
  ========================================= */
  const handleContinueEditing = async (draft) => {
    try {
      // Fetch latest draft data from backend to ensure we have the most recent version
      const res = await api.get(`/drafts/${draft._id}`);
      const latestDraft = res.data;
      
      // Dispatch event to Compose component with latest data
      window.dispatchEvent(
        new CustomEvent("albot:compose", {
          detail: {
            draftId: latestDraft._id,
            to: latestDraft.to || "",
            subject: latestDraft.subject || "",
            body: latestDraft.body || "",
            close: false,
          },
        })
      );
      
      // Navigate to Compose tab
      navigate("/home/compose");
    } catch (err) {
      console.error("❌ Error fetching latest draft:", err);
      // Fallback to using the draft from state if fetch fails
      window.dispatchEvent(
        new CustomEvent("albot:compose", {
          detail: {
            draftId: draft._id,
            to: draft.to || "",
            subject: draft.subject || "",
            body: draft.body || "",
            close: false,
          },
        })
      );
      navigate("/home/compose");
    }
  };

  /* =========================================
     ⏳ LOADING STATE
  ========================================= */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-xl">
        ⏳ Loading drafts...
      </div>
    );
  }

  /* =========================================
     📱 LIST VIEW (MOBILE + DESKTOP)
  ========================================= */
  if (!selectedDraft) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-200">
        <h2 className="text-xl font-bold p-4 border-b">📝 Drafts</h2>

        {drafts.length === 0 ? (
          <p className="p-6 text-center text-gray-500">
            No drafts available.
          </p>
        ) : (
          <ul>
            {drafts.map((draft) => (
              <li
                key={draft._id}
                onClick={() => setSelectedDraft(draft)}
                className="flex justify-between items-center px-4 py-3 border-b cursor-pointer hover:bg-gray-50"
              >
                <div className="truncate">
                  <p className="font-semibold truncate">
                    {draft.to || "No recipient"}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {draft.subject || "(No subject)"}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDraft(draft._id);
                  }}
                  className="text-red-500 text-sm hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* =========================================
     📄 OPENED DRAFT VIEW
  ========================================= */
  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
      {/* MOBILE BACK */}
      <button
        onClick={() => setSelectedDraft(null)}
        className="mb-4 text-blue-600 font-semibold hover:underline md:hidden"
      >
        ← Back to Drafts
      </button>

      <h2 className="text-xl font-bold mb-4">📝 Draft</h2>

      <div className="space-y-3 text-sm">
        <p>
          <span className="font-semibold">To:</span>{" "}
          {selectedDraft.to || "-"}
        </p>

        <p>
          <span className="font-semibold">Subject:</span>{" "}
          {selectedDraft.subject || "(No subject)"}
        </p>

        <div>
          <span className="font-semibold">Message:</span>
          <p className="mt-2 whitespace-pre-wrap bg-gray-50 p-3 rounded">
            {selectedDraft.body || "(Empty body)"}
          </p>
        </div>
      </div>

      <div className="flex gap-4 mt-6 flex-wrap">
        <button
          onClick={() => handleContinueEditing(selectedDraft)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold transition-colors"
        >
          ✍️ Continue Editing
        </button>

        <button
          onClick={() => deleteDraft(selectedDraft._id)}
          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-semibold transition-colors"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}
