// src/App.jsx
import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import HomePage from "./pages/HomePage";

// Mail Components
import Compose from "./components/Compose";
import Inbox from "./components/Inbox";
import Sent from "./components/Sent";
import Deleted from "./components/Deleted";
import Saved from "./components/Saved";

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="flex items-end gap-1 h-8 mb-6">
        <div className="w-1.5 bg-white animate-[bounce_1s_infinite_0ms]"></div>
        <div className="w-1.5 bg-white animate-[bounce_1s_infinite_100ms]"></div>
        <div className="w-1.5 bg-white animate-[bounce_1s_infinite_200ms]"></div>
        <div className="w-1.5 bg-white animate-[bounce_1s_infinite_300ms]"></div>
      </div>
      
      <h1 className="text-3xl font-bold text-white tracking-tighter italic">
        XMAIL<span className="text-gray-500">.</span>
      </h1>
      
      <div className="mt-4 w-48 h-1 bg-gray-900 rounded-full overflow-hidden">
        <div className="w-full h-full bg-white -translate-x-full animate-[loading_1.5s_infinite_ease-in-out]"></div>
      </div>
    </div>
  );
}

// Wrapper to sync active tab with route
function HomeWrapper() {
  const location = useLocation();

  const getInitialTab = () => {
    const path = location.pathname.split("/")[2];
    if (!path) return "Inbox";
    const tab = path.charAt(0).toUpperCase() + path.slice(1);
    return ["Inbox", "Sent", "Compose", "Deleted", "Saved"].includes(tab)
      ? tab
      : "Inbox";
  };

  return <HomePage activelist={getInitialTab()} />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Auth */}
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/home/inbox" replace />}
      />
      <Route
        path="/register"
        element={!user ? <Register /> : <Navigate to="/home/inbox" replace />}
      />

      {/* Protected */}
      <Route
        path="/home/*"
        element={user ? <HomeWrapper /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="inbox" replace />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="sent" element={<Sent />} />
        <Route path="compose" element={<Compose />} />
        <Route path="deleted" element={<Deleted />} />
        <Route path="saved" element={<Saved />} />
      </Route>

      {/* Catch all */}
      <Route
        path="*"
        element={<Navigate to={user ? "/home/inbox" : "/login"} replace />}
      />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
