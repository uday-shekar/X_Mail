import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SettingsModal from "../components/SettingsModal";
import { getInitials, stringToColor } from "../utils/avatarUtils";

// Mail components
import Compose from "../components/Compose";
import Inbox from "../components/Inbox";
import Sent from "../components/Sent";
import Deleted from "../components/Deleted";
import Saved from "../components/Saved";
import Drafts from "../components/Drafts";
import ALBot from "../components/ALBot";
import ModifyAIbot from "../components/ModifyAIbot";

// ICONS
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" />
  </svg>
);

const XMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const getTabIcon = (tab) => {
  const icons = {
    Compose: "✉️",
    Inbox: "📥",
    Sent: "📤",
    Deleted: "🗑️",
    Saved: "⭐",
    Drafts: "📝",
    "Modify Bot": "🤖",
  };
  return <span className="text-lg">{icons[tab] || "📦"}</span>;
};

export default function HomePage({ activelist = "Inbox" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState(activelist);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Mava, idhi mail select cheskovadaniki state
  const [selectedMailId, setSelectedMailId] = useState(null);

  const tabs = ["Compose", "Inbox", "Sent", "Deleted", "Saved", "Drafts", "Modify Bot"];

  useEffect(() => {
    const pathTab = location.pathname.split("/")[2];
    if (pathTab) {
      const matchingTab = tabs.find(tab => tab.replace(/\s+/g, "").toLowerCase() === pathTab.toLowerCase());
      if (matchingTab && matchingTab !== activeTab) {
        setActiveTab(matchingTab);
        setSelectedMailId(null); // Tab marinappudu mail selection clear chesthunna
      }
    }
  }, [location.pathname, activeTab]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setSelectedMailId(null); // Reset selection
    setIsSidebarOpen(false);
    navigate(`/home/${tab.replace(/\s+/g, "").toLowerCase()}`);
  };

  useEffect(() => {
    if (!user) {
      const storedUser = localStorage.getItem("xmailUser");
      if (!storedUser) navigate("/login");
    }
    setLoading(false);
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderProfileAvatar = () => {
    if (!user) return null;
    const displayName = user?.username || user?.userId || "?";
    const initials = getInitials(displayName);
    const color = stringToColor(displayName);

    if (user?.profilePic) {
      return (
        <img
          src={`${user.profilePic}?t=${Date.now()}`}
          alt="Profile"
          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md cursor-pointer"
        />
      );
    }

    return (
      <div
        className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-lg cursor-pointer"
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
    );
  };

  // Content render logic updated for "List View" vs "Detail View"
  const renderContent = () => {
    const props = { 
        searchTerm, 
        selectedMailId, 
        setSelectedMailId // Components ki pass chesthunna so they can handle clicks
    };

     switch (activeTab) {
          case "Compose":
            return <Compose key="compose" />;
          case "Inbox":
            return <Inbox key="inbox" {...props} />;
          case "Sent":
            return <Sent key="sent" {...props} />;
          case "Deleted":
            return <Deleted key="deleted" {...props} />;
          case "Saved":
            return <Saved key="saved" {...props} />;
          case "Drafts":
            return <Drafts key="drafts" />;
          case "Modify Bot":
            return <ModifyAIbot key="modifybot" />;
          default:
            return null;
        }
      };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-black-600 text-3xl font-bold animate-pulse bg-gray-100">
        🚀 Loading Xmail...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen w-full bg-gray-100 text-gray-800 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="flex justify-between items-center h-16 px-4 md:px-6 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 w-full">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            className="md:hidden p-2 text-black-600 hover:text-black-600 rounded-lg"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div
            className="text-xl md:text-2xl font-extrabold tracking-wide text-black-600 flex items-center gap-1 md:gap-2 cursor-pointer"
            onClick={() => handleTabClick("Inbox")}
          >
           <div className="flex items-center gap-2">
  <img
    src="/x.png"
    alt="Xmail Logo"
    className="h-8 md:h-10 w-auto"
  />
  <span className="text-2xl md:text-3xl font-semibold tracking-wide">
    Xmail
  </span>
</div>

          </div>
        </div>

        {/* SEARCH BAR - Fixed responsive display */}
        <div className="flex-1 max-w-xl mx-2 md:mx-auto px-2">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 md:py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-black bg-gray-50 outline-none"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <SearchIcon />
            </div>
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                <XMarkIcon />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div onClick={() => setIsSettingsOpen(true)} className="shrink-0">
            {renderProfileAvatar()}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex w-full relative">
        
        {/* SIDEBAR - Responsive handled with Z-index and transition */}
        <aside
          className={`w-64 bg-white p-6 flex flex-col justify-between border-r border-black-200 fixed h-[calc(100vh-4rem)] transition-transform duration-300 z-50 md:sticky md:top-16 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
        >
          <div className="flex flex-col space-y-4 overflow-y-auto pb-4 custom-scrollbar">
            
            <div
              className="flex items-center gap-3 pb-6 border-b border-gray-100 cursor-pointer"
              onClick={() => {
                setIsSettingsOpen(true);
                setIsSidebarOpen(false);
              }}
            >
              {renderProfileAvatar()}
              <div className="truncate">
                <div className="font-semibold text-gray-800 truncate text-sm">{user?.username}</div>
                <div className="text-xs text-gray-500 truncate">{user?.userId}</div>
              </div>
            </div>

           <button
              onClick={() => handleTabClick("Compose")}
               className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition shadow-sm ${
               activeTab === "Compose"
                  ? "bg-black text-white shadow-md"
                      : "bg-black text-white hover:bg-gray-900"
                  }`}
                >
            {getTabIcon("Compose")} Compose
         </button>


            <nav className="space-y-1 pt-4">
              {tabs.filter((t) => t !== "Compose").map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm transition ${
                    activeTab === tab
                      ? "bg-gray-900 text-white font-semibold border-l-2 border-bl-600"
                      : "text-gray-700 hover:bg-gray-800 hover:text-white"
                  }`}
                   
                >
                  {getTabIcon(tab)}
                  <span>{tab}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-4 border-t border-black-200 mt-auto">
            <button
              onClick={handleLogout}
              className="w-full bg-red-500 hover:bg-red-600 px-4 py-2.5 rounded-lg text-white font-semibold transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] p-0 md:p-0 bg-gray-100 w-full overflow-x-hidden">
          <div className="w-full h-full">
            {renderContent()}
          </div>
        </main>
      </div>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {user && (
        <ALBot
          user={user}
          onSendMail={() => handleTabClick("Compose")}
          onReadMail={() => handleTabClick("Inbox")}
          onDeleteMail={() => handleTabClick("Deleted")}
          onSaveMail={() => handleTabClick("Saved")}
          onReplyMail={() => handleTabClick("Inbox")}
        />
      )}
    </div>
  );
}
  