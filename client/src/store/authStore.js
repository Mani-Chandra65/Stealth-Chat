import { create } from 'zustand';
import { clearPrivateKey } from './cryptoStore.js';
import { removeEncryptedPrivateKey, removePublicKey } from '../utils/indexedDB.js';
import axios from 'axios';

export const SESSION_HINT_KEY = 'stealth-chat-session';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,

  setInitializing: (status) => set({ isInitializing: status }),
  
  setToken: (accessToken) => set({ accessToken, isAuthenticated: !!accessToken }),
  
  setUser: (user) => set({ user }),

  login: (user, accessToken) => {
    localStorage.setItem(SESSION_HINT_KEY, 'active');
    set({ user, accessToken, isAuthenticated: true, isInitializing: false });
  },

  clearAuth: async () => {
    localStorage.removeItem(SESSION_HINT_KEY);
    clearPrivateKey();
    const user = get().user;
    if (user?.id) {
      await removeEncryptedPrivateKey(user.id);
      await removePublicKey(user.id);
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: false
    });
  },

  logout: async () => {
    try {
      // Call the backend to revoke the HttpOnly cookie and session
      await axios.post('/api/v1/auth/logout', {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      // Regardless of the network result, locally clear the state
      await get().clearAuth();
    }
  }
}));
