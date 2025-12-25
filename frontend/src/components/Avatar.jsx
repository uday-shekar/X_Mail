import React, { useState } from "react";
import { getInitials, stringToColor } from "../utils/avatarUtils";

export default function UserAvatar({ email, dp, size = 45 }) {
  const [imgError, setImgError] = useState(false);

  const initials = getInitials(email);
  const bg = stringToColor(email);

  const showLetterAvatar = imgError || !dp;

  if (!showLetterAvatar) {
    return (
      <img
        src={dp}
        alt="dp"
        onError={() => setImgError(true)} // fallback if image fails
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: size / 2.1,
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
}
