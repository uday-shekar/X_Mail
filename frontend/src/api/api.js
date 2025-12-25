// src/api/api.js

const BASE_URL = "https://xmail-96ao.onrender.com/api";

// =========================
// Helper: Request Wrapper
// =========================
async function request(url, method = "GET", token = null, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: data.error || "Something went wrong",
      };
    }

    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: "Server not reachable",
    };
  }
}

// =========================
// AUTH APIs
// =========================

export async function registerUser(data) {
  return request(`${BASE_URL}/auth/register`, "POST", null, data);
}

export async function loginUser(data) {
  return request(`${BASE_URL}/auth/login`, "POST", null, data);
}

// =========================
// EMAIL APIs
// =========================

export async function composeEmail(token, data) {
  return request(`${BASE_URL}/email/compose`, "POST", token, data);
}

export async function fetchInbox(token) {
  return request(`${BASE_URL}/email/inbox`, "GET", token);
}

// =========================
// USER PROFILE APIs
// =========================

export async function updateProfile(token, data) {
  return request(`${BASE_URL}/user/update-profile`, "PUT", token, data);
}

// For updating ONLY profile pic
export async function updateProfilePic(token, imageUrl) {
  return request(`${BASE_URL}/user/update-pic`, "PUT", token, { profilePic: imageUrl });
}
