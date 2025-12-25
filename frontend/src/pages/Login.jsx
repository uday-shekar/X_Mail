import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!userId || !password) {
      return setErrorMsg("⚠️ Please fill in both fields");
    }

    if (!userId.trim().endsWith("@xmail.com")) {
      return setErrorMsg("⚠️ User ID must end with @xmail.com");
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/login", {
        userId: userId.trim().toLowerCase(),
        password: password.trim(),
      });

      const { accessToken, refreshToken, user } = res.data;

      if (!accessToken || !refreshToken || !user) {
        return setErrorMsg("❌ Invalid server response");
      }

      // 🔥 IMPORTANT: user.profilePic MUST come from backend
      const storedUser = {
        ...user,
        accessToken,
        refreshToken,
      };

      // Save session
      localStorage.setItem("xmailUser", JSON.stringify(storedUser));
      setUser(storedUser);

      navigate("/home");
    } catch (err) {
      console.error("Login error:", err.response?.data);
      if (!err.response) {
        setErrorMsg("❌ Cannot reach server. Start backend first.");
      } else {
        setErrorMsg(err.response.data.message || "❌ Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-900 font-sans p-4 relative">
      <form
        onSubmit={handleLogin}
        className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-xl w-full max-w-sm z-10 text-white"
      >
        <div className="text-center mb-10">
          <svg
            className="w-12 h-12 mx-auto text-white drop-shadow-lg mb-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l9 6 9-6M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
            />
          </svg>

          <h2 className="text-3xl font-bold mb-2">Account Login</h2>
          <p className="text-sm">Access your AI-powered inbox.</p>
        </div>

        {errorMsg && (
          <p className="bg-red-500 text-white text-sm text-center font-medium p-3 rounded-lg mb-6 shadow-md">
            {errorMsg}
          </p>
        )}

        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="UserId@xmail.com"
          className="w-full px-10 py-3 rounded-xl bg-white/20 text-white mb-5"
          autoComplete="username"
          disabled={loading}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-10 py-3 rounded-xl bg-white/20 text-white mb-8"
          autoComplete="current-password"
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full ${
            loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
          } text-white font-extrabold py-3 rounded-xl transition-all duration-300 uppercase tracking-wider shadow-lg shadow-blue-500/50`}
        >
          {loading ? "AUTHENTICATING..." : "Login"}
        </button>

        <p className="text-white text-center mt-8 text-sm">
          Don’t have an account?{" "}
          <span
            className="font-semibold cursor-pointer text-white/80 hover:text-white"
            onClick={() => navigate("/register")}
          >
            Register Now
          </span>
        </p>
      </form>
    </div>
  );
}
