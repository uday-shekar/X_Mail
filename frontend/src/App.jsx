// src/App.jsx
import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-4 border-4 border-purple-400 border-b-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
      </div>
      <h1 className="text-3xl font-bold animate-pulse">Xmail</h1>
      <p className="text-purple-300 mt-2 text-lg">Checking session...</p>
    </div>
  );
}

// Wrapper to sync active tab with route
function HomeWrapper() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial active tab from URL
  const getInitialTab = () => {
    const path = location.pathname.split("/")[2]; // e.g., "deleted" from "/home/deleted"
    if (!path) return "Inbox"; // default
    const capitalized = path.charAt(0).toUpperCase() + path.slice(1);
    return ["Inbox", "Sent", "Compose", "Deleted", "Saved", "Drafts", "Modify Bot"].includes(capitalized)
      ? capitalized
      : "Inbox";
  };

  return <HomePage activelist={getInitialTab()} />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/home/inbox" replace />}
      />
      <Route
        path="/register"
        element={!user ? <Register /> : <Navigate to="/home/inbox" replace />}
      />

      {/* Protected Routes */}
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

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={user ? "/home/inbox" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
