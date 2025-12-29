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
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-3xl font-bold animate-pulse">Xmail</h1>
      <p className="text-gray-400 mt-2">Checking session...</p>
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
