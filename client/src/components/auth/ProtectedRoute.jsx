import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getPrivateKey } from '../../store/cryptoStore.js';
import UnlockVault from './UnlockVault.jsx';

const checkToken = () => {
  const accessToken = sessionStorage.getItem('accessToken');
  if (!accessToken) {
    return { valid: false, message: 'Please log in to access this page.' };
  }

  try {
    const base64Url = accessToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const { exp } = JSON.parse(jsonPayload);
    const currentTime = Date.now() / 1000;

    if (exp < currentTime) {
      return { valid: false, message: 'Session expired. Please log in again.' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, message: 'Invalid session. Please log in again.' };
  }
};

function RedirectWithToast({ message }) {
  useEffect(() => {
    // We use a specific toast 'id' to prevent the same toast from duplicating
    toast.error(message, { id: 'auth-error' });
  }, [message]);

  return <Navigate to="/login" replace />;
}

export default function ProtectedRoute({ children }) {
  const { valid, message } = checkToken();
  const [isUnlocked, setIsUnlocked] = useState(!!getPrivateKey());

  if (!valid) {
    // Clear out potentially corrupted data before redirecting
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    
    return <RedirectWithToast message={message} />;
  }

  // If the JWT is valid, but the user hit F5 and wiped the vault memory
  if (!isUnlocked) {
    return <UnlockVault onUnlock={() => setIsUnlocked(true)} />;
  }

  return children;
}
