import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import AuthProvider from './components/auth/AuthProvider.jsx';

// Dashboard Layout & Pages
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Chats from './pages/dashboard/Chats.jsx';
import Groups from './pages/dashboard/Groups.jsx';
import Search from './pages/dashboard/Search.jsx';
import Profile from './pages/dashboard/Profile.jsx';
import Settings from './pages/dashboard/Settings.jsx';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Dashboard Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            } 
          >
            {/* Redirect root to /chats automatically */}
            <Route index element={<Navigate to="/chats" replace />} />
            
            <Route path="chats" element={<Chats />} />
            <Route path="groups" element={<Groups />} />
            <Route path="search" element={<Search />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/:username" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;
