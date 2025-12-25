import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name || !userId || !password) {
      return setErrorMsg("⚠️ Please fill in all fields");
    }

    if (!userId.trim().endsWith("@xmail.com")) {
      return setErrorMsg("⚠️ User ID must end with @xmail.com");
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/register", {
        name: name.trim(),
        userId: userId.trim().toLowerCase(),
        password,
      });

      const { accessToken, refreshToken, user } = res.data;
      if (!accessToken || !refreshToken || !user) {
        return setErrorMsg("❌ Invalid server response");
      }

      const storedUser = { ...user, accessToken, refreshToken };
      localStorage.setItem("xmailUser", JSON.stringify(storedUser));
      setUser(storedUser);

      navigate("/home");
    } catch (err) {
      console.error("Register error details:", err.response?.data, err.message);

      if (!err.response) {
        setErrorMsg(
          "❌ Unable to reach server. Make sure backend is running and accessible."
        );
      } else if (err.response.status === 409) {
        setErrorMsg("❌ User ID already exists.");
      } else {
        setErrorMsg(err.response?.data?.message || "❌ Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-900 font-sans p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            fill="currentColor"
            points="0,0 100,0 100,100"
            className="text-blue-400 opacity-20 animate-fade-in-up"
          />
          <polygon
            fill="currentColor"
            points="0,0 0,100 100,100"
            className="text-blue-600 opacity-20 animate-fade-in-up"
          />
          <polygon
            fill="currentColor"
            points="50,0 100,50 50,100 0,50"
            className="text-blue-300 opacity-20 animate-fade-in-up"
          />
        </svg>
      </div>

      {/* Decorative floating blobs */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl animate-spin-slow" />
      <div className="pointer-events-none absolute bottom-10 -right-10 w-52 h-52 rounded-full bg-white/10 blur-3xl animate-spin-slow" />

      <form
        onSubmit={handleRegister}
        className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md z-10 text-white animate-fade-in-up"
      >
        <div className="text-center mb-10">
          <svg
            className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 text-white animate-fade-in-up"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l9 6 9-6"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 8v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8"
            />
          </svg>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Create Account</h2>
          <p className="text-xs sm:text-sm text-white/90">Join Xmail now.</p>
        </div>

        {errorMsg && (
          <p className="bg-red-500 text-white text-xs sm:text-sm text-center font-medium p-3 rounded-lg mb-6 shadow-md animate-fade-in-up">
            {errorMsg}
          </p>
        )}

        {/* Name */}
        <div className="relative mb-5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Full Name"
            className="w-full px-10 py-3 rounded-xl bg-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white transition duration-300 border-2 border-white/10 focus:border-white/40 focus:shadow-lg focus:shadow-blue-500/20"
            autoComplete="name"
            disabled={loading}
          />
        </div>

        {/* User ID */}
        <div className="relative mb-5">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="yourId@xmail.com"
            className="w-full px-10 py-3 rounded-xl bg-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white transition duration-300 border-2 border-white/10 focus:border-white/40 focus:shadow-lg focus:shadow-blue-500/20"
            autoComplete="username"
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div className="relative mb-8">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-10 py-3 rounded-xl bg-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white transition duration-300 border-2 border-white/10 focus:border-white/40 focus:shadow-lg focus:shadow-blue-500/20"
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full ${
            loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700 hover:scale-[1.02]"
          } text-white font-extrabold py-3 rounded-xl transition-all duration-300 uppercase tracking-wider shadow-lg shadow-blue-500/50 active:scale-[0.98]`}
        >
          {loading ? "CREATING ACCOUNT..." : "Create Account"}
        </button>

        <p className="text-white text-center mt-8 text-xs sm:text-sm">
          Already have an account?{" "}
          <span
            className="font-semibold cursor-pointer text-white/80 hover:text-white transition duration-150"
            onClick={() => navigate("/login")}
          >
            Login Here
          </span>
        </p>
      </form>
    </div>
  );
}
