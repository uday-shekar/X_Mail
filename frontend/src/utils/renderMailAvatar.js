import { stringToColor, getInitials } from "./avatarUtils";

export const renderMailAvatar = (mailUser) => {
  // mailUser means → mail.fromUser / mail.sender object

  if (!mailUser) return null;

  // If sender has DP → show image
  if (mailUser.profilePic) {
    return (
      <img
        src={`${mailUser.profilePic}?t=${Date.now()}`}
        alt="DP"
        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
      />
    );
  }

  // Else → show avatar circle
  const bg = stringToColor(mailUser.userId || mailUser.email || "?");
  const initial = getInitials(mailUser.userId || mailUser.email || "?");

  return (
    <div
      className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-md"
      style={{ backgroundColor: bg }}
    >
      {initial}
    </div>
  );
};
