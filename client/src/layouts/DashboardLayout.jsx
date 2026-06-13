import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { getSocket } from '../lib/socket.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  MessageSquare, 
  Users, 
  Search as SearchIcon, 
  User, 
  Settings as SettingsIcon, 
  LogOut, 
  PanelLeftClose, 
  PanelRightClose,
  Menu,
  X
} from 'lucide-react';

const navItems = [
  { path: '/chats', label: 'Chats', icon: MessageSquare },
  { path: '/groups', label: 'Groups', icon: Users },
  { path: '/search', label: 'Search', icon: SearchIcon },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { logout, user, accessToken } = useAuthStore();
  const navigate = useNavigate();

  const socket = getSocket();
  const { 
    addUnreadChat, 
    addUnreadGroup, 
    addUnreadRequest, 
    removeUnreadRequest,
    setUnreadRequests,
    getTotalUnreadChats,
    getTotalUnreadGroups,
    unreadRequests
  } = useNotificationStore();

  const unreadChatsCount = getTotalUnreadChats();
  const unreadGroupsCount = getTotalUnreadGroups();
  const unreadRequestsCount = unreadRequests.length;

  // Fetch initial pending requests count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await axios.get("/api/v1/connections/pending", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        setUnreadRequests(response.data.map(r => r.connectionId));
      } catch (err) {
        console.error("Failed to fetch pending requests count:", err);
      }
    };
    if (accessToken) {
      fetchPendingCount();
    }
  }, [accessToken]);

  // Global socket listener for background notifications
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (payload) => {
      addUnreadChat(payload.chatId);
    };

    const handleGroupMessageReceived = (payload) => {
      addUnreadGroup(payload.groupId);
    };

    const handleRequestReceived = (payload) => {
      addUnreadRequest(payload.connectionId);
      toast("New connection request received!", { icon: "👋" });
    };

    const handleConnectionAccepted = (payload) => {
      removeUnreadRequest(payload.connectionId);
      toast(`Connection request accepted by ${payload.peerUsername}!`, { icon: "🤝" });
    };

    const handleConnectionRejected = (payload) => {
      removeUnreadRequest(payload.connectionId);
    };

    socket.on("message:received", handleMessageReceived);
    socket.on("group:message-received", handleGroupMessageReceived);
    socket.on("connection:request-received", handleRequestReceived);
    socket.on("connection:accepted", handleConnectionAccepted);
    socket.on("connection:rejected", handleConnectionRejected);

    return () => {
      socket.off("message:received", handleMessageReceived);
      socket.off("group:message-received", handleGroupMessageReceived);
      socket.off("connection:request-received", handleRequestReceived);
      socket.off("connection:accepted", handleConnectionAccepted);
      socket.off("connection:rejected", handleConnectionRejected);
    };
  }, [socket]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col md:flex-row h-dvh bg-gray-50 font-sans overflow-hidden">
      
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0 z-30 shadow-sm">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="p-1.5 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Menu size={22} />
        </button>
        <span className="font-bold text-lg text-blue-600">StealthChat</span>
        <div className="w-8" />
      </header>

      {/* Backdrop for mobile drawer */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 fixed md:static inset-y-0 left-0 z-40 transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64 h-full`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          {!isCollapsed && (
            <span className="font-bold text-xl text-blue-600 truncate">
              StealthChat
            </span>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden md:block p-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors ${
              isCollapsed ? 'mx-auto' : ''
            }`}
          >
            {isCollapsed ? <PanelRightClose size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info (Minimizable) */}
        {!isCollapsed && user && (
          <div className="px-4 py-6 border-b border-gray-100">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
              Logged in as
            </p>
            <p className="mt-1 font-medium text-gray-900 truncate">{user.username}</p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
          {navItems.map((item) => {
            let badgeCount = 0;
            if (item.path === "/chats") {
              badgeCount = unreadChatsCount + unreadRequestsCount;
            } else if (item.path === "/groups") {
              badgeCount = unreadGroupsCount;
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${isCollapsed ? 'md:justify-center md:px-0' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3 relative">
                  <item.icon size={22} className="shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                  
                  {/* Collapsed Badge (red dot) */}
                  {isCollapsed && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Expanded Badge (number bubble) */}
                {(!isCollapsed || false) && badgeCount > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none min-w-4 h-4 shadow-sm">
                    {badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Actions (Logout) */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors ${
              isCollapsed ? 'md:justify-center md:px-0' : ''
            }`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut size={22} className="shrink-0" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-white h-full relative">
        <Outlet />
      </main>
    </div>
  );
}
