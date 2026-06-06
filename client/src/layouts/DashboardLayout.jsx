import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { 
  MessageSquare, 
  Users, 
  Search as SearchIcon, 
  User, 
  Settings as SettingsIcon, 
  LogOut, 
  PanelLeftClose, 
  PanelRightClose 
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
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside 
        className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
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
            className={`p-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors ${
              isCollapsed ? 'mx-auto' : ''
            }`}
          >
            {isCollapsed ? <PanelRightClose size={20} /> : <PanelLeftClose size={20} />}
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
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${isCollapsed ? 'justify-center px-0' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={22} className="shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions (Logout) */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut size={22} className="shrink-0" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-white">
        <Outlet />
      </main>
    </div>
  );
}
