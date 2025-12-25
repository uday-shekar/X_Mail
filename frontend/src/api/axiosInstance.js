import axios from "axios";

/* ===========================================================
   🌍 Dynamic API Base URL Setup
   - Works for localhost, devtunnels, and deployed environments
=========================================================== */
let API_BASE_URL = "https://xmail-96ao.onrender.com"; // default

// if (typeof window !== "undefined") {
//   if (import.meta.env?.VITE_API_URL) {
//     // ✅ Use Vite .env variable if available
//     API_BASE_URL = import.meta.env.VITE_API_URL;
//   } else if (window.location.hostname.includes("devtunnels.ms")) {
//     // ✅ Automatically detect devtunnel URLs
//     API_BASE_URL = `https://${window.location.hostname}`;
//   } else if (window.location.hostname !== "localhost") {
//     // ✅ Deployed domain auto-detect
//     API_BASE_URL = window.location.origin;
//   }
// }

/* ===========================================================
   ⚙️ Axios Instance
=========================================================== */
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`, // ✅ baseURL ends with /api
  withCredentials: true,
});

/* ===========================================================
   🧩 Request Interceptor
   - Adds Bearer token from localStorage (xmailUser)
=========================================================== */
api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem("xmailUser");
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.accessToken) {
          config.headers.Authorization = `Bearer ${user.accessToken}`;
        } else {
          console.warn("⚠️ No accessToken found in stored user");
        }
      } else {
        console.warn("⚠️ No xmailUser found in localStorage");
      }
    } catch (err) {
      console.warn("⚠️ Invalid xmailUser data:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ===========================================================
   🔁 Token Refresh System
=========================================================== */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    if (!originalRequest) return Promise.reject(error);

    // 🔒 Handle Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      let user;
      try {
        const stored = localStorage.getItem("xmailUser");
        if (!stored) throw new Error("User not found");
        user = JSON.parse(stored);
      } catch {
        localStorage.removeItem("xmailUser");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // ❌ No refresh token — force logout
      if (!user?.refreshToken) {
        localStorage.removeItem("xmailUser");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // 🕓 Queue other requests while refresh is ongoing
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // 🚀 Start token refresh process
      isRefreshing = true;
      try {
        const res = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refreshToken: user.refreshToken },
          { withCredentials: true }
        );

        const newAccessToken = res.data?.accessToken;
        if (!newAccessToken) throw new Error("No access token returned");

        // 🧠 Save updated token
        user.accessToken = newAccessToken;
        localStorage.setItem("xmailUser", JSON.stringify(user));

        // ✅ Resolve queued requests
        processQueue(null, newAccessToken);

        // 🔁 Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("xmailUser");
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // ❌ Other errors
    return Promise.reject(error);
  }
);

/* ===========================================================
   🚀 Export API Instance
=========================================================== */
export default api;
