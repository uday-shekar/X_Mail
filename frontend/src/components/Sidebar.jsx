// Sidebar.jsx
export default function Sidebar({ setActiveSection }) {
  return (
    <div className="sidebar-buttons">
      <button onClick={() => setActiveSection('inbox')}>Inbox</button>
      <button onClick={() => setActiveSection('sent')}>Sent</button>
      <button onClick={() => setActiveSection('deleted')}>Deleted</button>
    </div>
  );
}
