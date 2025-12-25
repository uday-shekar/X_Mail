import React, { useState } from "react";
import { getInitials, stringToColor } from "../utils/avatarUtils";
import api from "../api/axiosInstance";

/**
 * UserAvatar Component
 * Shows profile picture if available, otherwise shows initials with color
 * @param {string} email - User email/ID
 * @param {string} dp - Profile picture URL (can be relative or absolute)
 * @param {number} size - Avatar size in pixels (default: 45)
 */
export default function UserAvatar({ email, dp, size = 45 }) {
  const [imageError, setImageError] = useState(false);

  // Helper function to get full URL if dp is a relative path
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL (starts with http:// or https://), return as is
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    
    // If it's a relative path, prepend the base URL (without /api since uploads are at root)
    // Get base URL from axios instance and remove /api if present
    let baseURL = api.defaults.baseURL || "http://localhost:5000/api";
    // Remove /api from the end if present (uploads are served at root level)
    baseURL = baseURL.replace(/\/api\/?$/, "");
    // Remove trailing slash
    baseURL = baseURL.replace(/\/$/, "");
    // Ensure imagePath starts with /
    const cleanImagePath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    
    return `${baseURL}${cleanImagePath}`;
  };

  // Check if a valid DP URL is provided and image hasn't errored
  const imageUrl = getImageUrl(dp);
  if (imageUrl && !imageError) {
    return (
      <img
        src={imageUrl}
        alt={email ? getInitials(email) : "Avatar"}
        className="flex-shrink-0 rounded-full object-cover shadow-md border-2 border-white"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        onError={() => setImageError(true)}
      />
    );
  }

  // Fallback: Display the initials-based avatar
  const initials = getInitials(email || "?");
  const color = stringToColor(email || "?");

  return (
    <div
      className="flex-shrink-0 rounded-full text-white flex items-center justify-center font-bold select-none shadow-md"
      style={{
        backgroundColor: color,
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size * 0.4}px`,
      }}
    >
      {initials}
    </div>
  );
}

