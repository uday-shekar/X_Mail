// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem("xmailUser");

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        try {
          // 1) REFRESH ACCESS TOKEN
          const res = await axios.post(
            "https://xmail-96ao.onrender.com/api/auth/refresh",
            { refreshToken: parsed.refreshToken }
          );

          const { accessToken } = res.data;

          // Prepare updated user (keep old DP safe)
          let updated = {
            ...parsed,
            accessToken,
          };

          // 2) LOAD FULL USER DATA (name, email, DP etc)
          const userRes = await axios.get(
            "https://xmail-96ao.onrender.com/api/user/me",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          // MERGE + ONLY OVERRIDE FIELDS THAT EXIST
          updated = {
            ...updated,
            ...userRes.data.user,
            profilePic: userRes.data.user.profilePic || parsed.profilePic || null,
          };

          // Save updated user
          localStorage.setItem("xmailUser", JSON.stringify(updated));
          setUser(updated);

        } catch (err) {
          console.error("Refresh failed:", err.response?.data);
          localStorage.removeItem("xmailUser");
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("xmailUser");
    setUser(null);
  };

  // GLOBAL UPDATE (DP, NAME, ANY FIELD)
  const updateUser = (newFields) => {
    setUser((prev) => {
      const updated = {
        ...prev,
        ...newFields,
      };

      localStorage.setItem("xmailUser", JSON.stringify(updated));

      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, updateUser, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
