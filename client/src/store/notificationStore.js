import { create } from "zustand";

export const useNotificationStore = create((set, get) => ({
  unreadChats: {}, // connectionId => count
  unreadGroups: {}, // groupId => count
  unreadRequests: [], // array of connectionIds

  activeChatId: null,
  activeGroupId: null,

  setActiveChatId: (id) => {
    set({ activeChatId: id });
    if (id) {
      get().clearUnreadChat(id);
    }
  },

  setActiveGroupId: (id) => {
    set({ activeGroupId: id });
    if (id) {
      get().clearUnreadGroup(id);
    }
  },

  addUnreadChat: (chatId) => {
    if (get().activeChatId === chatId && window.location.pathname === "/chats") {
      return;
    }
    set((state) => {
      const current = state.unreadChats[chatId] || 0;
      return {
        unreadChats: {
          ...state.unreadChats,
          [chatId]: current + 1,
        },
      };
    });
  },

  clearUnreadChat: (chatId) => {
    set((state) => {
      const updated = { ...state.unreadChats };
      delete updated[chatId];
      return { unreadChats: updated };
    });
  },

  addUnreadGroup: (groupId) => {
    if (get().activeGroupId === groupId && window.location.pathname === "/groups") {
      return;
    }
    set((state) => {
      const current = state.unreadGroups[groupId] || 0;
      return {
        unreadGroups: {
          ...state.unreadGroups,
          [groupId]: current + 1,
        },
      };
    });
  },

  clearUnreadGroup: (groupId) => {
    set((state) => {
      const updated = { ...state.unreadGroups };
      delete updated[groupId];
      return { unreadGroups: updated };
    });
  },

  setUnreadRequests: (requests) => {
    set({ unreadRequests: requests });
  },

  addUnreadRequest: (connectionId) => {
    set((state) => {
      if (state.unreadRequests.includes(connectionId)) return {};
      return { unreadRequests: [...state.unreadRequests, connectionId] };
    });
  },

  removeUnreadRequest: (connectionId) => {
    set((state) => ({
      unreadRequests: state.unreadRequests.filter((id) => id !== connectionId),
    }));
  },

  getTotalUnreadChats: () => {
    return Object.values(get().unreadChats).reduce((sum, count) => sum + count, 0);
  },

  getTotalUnreadGroups: () => {
    return Object.values(get().unreadGroups).reduce((sum, count) => sum + count, 0);
  },
}));
