import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore.js';
import { getPrivateKey } from '../../store/cryptoStore.js';
import UnlockVault from './UnlockVault.jsx';

function RedirectWithToast({ message }) {
  useEffect(() => {
    toast.error(message, { id: 'auth-error' });
  }, [message]);
  return <Navigate to="/login" replace />;
}

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const [isUnlocked, setIsUnlocked] = useState(!!getPrivateKey());

  // Prevent flashing the login screen or vault while verifying the refresh token
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-500">
        Authenticating...
      </div>
    );
  }

  // Pure state evaluation instead of JWT decoding
  if (!isAuthenticated) {
    return <RedirectWithToast message="Please log in to access this page." />;
  }

  if (!isUnlocked) {
    return <UnlockVault onUnlock={() => setIsUnlocked(true)} />;
  }

  return children;
}
