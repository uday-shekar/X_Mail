// src/utils/avatarUtils.js

// 🎨 Generate consistent color for avatars
export const stringToColor = (str = "") => {
    if (!str) return "#444444"; // Default color

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert hash → 3 RGB values
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        color += ("00" + value.toString(16)).slice(-2);
    }

    return color;
};

// 🔤 Extract initials safely from email
export const getInitials = (email = "") => {
    if (!email) return "?";
    
    const namePart = email.split("@")[0];

    if (!namePart) return "?";

    return namePart.charAt(0).toUpperCase();
};
