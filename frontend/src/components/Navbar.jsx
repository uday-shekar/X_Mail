// src/components/Navbar.jsx

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getInitials, stringToColor } from '../utils/avatarUtils'; // Assuming you have these utilities

export default function Navbar({ searchTerm, setSearchTerm, onOpenSettings }) {
    const { user } = useAuth(); // Logged-in user details

    // Render avatar: Use profilePic if available, otherwise initials with unique color
    const renderProfileAvatar = () => {
        const email = user?.email || "?";
        const initials = getInitials(email);
        const color = stringToColor(email);

        // 💡 Assumption: If user object has a profilePic URL, use it.
        if (user?.profilePic) {
            return (
                <img
                    src={user.profilePic}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md cursor-pointer"
                />
            );
        }

        return (
            <div
                className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-lg select-none cursor-pointer"
                style={{ backgroundColor: color }}
            >
                {initials}
            </div>
        );
    };

    return (
        <nav className="bg-white shadow-md p-3 flex items-center justify-between sticky top-0 z-10 border-b border-gray-200">
            {/* Logo/App Name */}
            <h1 className="text-2xl font-extrabold text-blue-600 mr-4 min-w-max">
                MyEmailApp
            </h1>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl mx-4">
                <input
                    type="text"
                    placeholder="Search mail by subject, body or sender..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2.5 pl-4 border border-gray-300 rounded-full shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
            </div>

            {/* 💡 Settings and Profile */}
            <div className="flex items-center gap-4">
                
                {/* 1. Settings Button */}
                <button
                    onClick={onOpenSettings}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
                    title="Settings"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.78.36-4.524 3.203-4.524.385 0 .762.062 1.127.185-.436.377-.923.77-1.408 1.157M12 21V3m-4 8H2m4 0h6m4 0h6m-4 4h-2m-2-4h-2m-2-4h-2m-2-4h-2m-2-4H2m18 0h-2m-2 4h-2m-2 4h-2m-2 4h-2M18 10a8 8 0 10-16 0 8 8 0 0016 0z"></path></svg>
                </button>

                {/* 2. Profile Avatar */}
                {user && (
                    <div onClick={onOpenSettings} title="Open Profile Settings">
                        {renderProfileAvatar()}
                    </div>
                )}
            </div>
        </nav>
    );
}