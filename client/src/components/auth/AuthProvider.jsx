import { useEffect } from 'react';
import { SESSION_HINT_KEY, useAuthStore } from '../../store/authStore.js';
import axios from 'axios';
import { getPrivateKey } from '../../store/cryptoStore.js';

const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true
});

let refreshRequest;

const restoreSession = () => {
  if (!refreshRequest) {
    refreshRequest = apiClient.post('/auth/refresh-token');
  }

  return refreshRequest;
};

export default function AuthProvider({ children }) {
  const { login, clearAuth, setInitializing } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      if (!localStorage.getItem(SESSION_HINT_KEY)) {
        setInitializing(false);
        return;
      }

      try {
        setInitializing(true);
        const response = await restoreSession();
        
        if (response.data.accessToken && response.data.user) {
           login(response.data.user, response.data.accessToken);
        } else {
           await clearAuth();
        }
      } catch {
        await clearAuth();
      }
    };

    initializeAuth();
  }, [login, clearAuth, setInitializing]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      try {
        if (getPrivateKey()) {
          const message = 'Refreshing will clear your unlocked vault. You will need to re-enter your password to unlock it.';
          e.preventDefault();
          e.returnValue = message; // Chrome requires setting returnValue
          return message;
        }
      } catch {
        // Fail silently — don't block unload if something goes wrong
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return children;
}
