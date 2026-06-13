// Singleton to keep CryptoKey in memory without persisting it directly to LocalStorage
let decyptedPrivateKey = null;
const activeChatKeys = new Map(); // connectionId => CryptoKey (AES-GCM)
const activeGroupKeys = new Map(); // groupId => CryptoKey (AES-GCM)

export const setPrivateKey = (key) => {
  decyptedPrivateKey = key;
};

export const getPrivateKey = () => {
  return decyptedPrivateKey;
};

export const clearPrivateKey = () => {
  decyptedPrivateKey = null;
  activeChatKeys.clear();
  activeGroupKeys.clear();
};

export const setChatKey = (connectionId, key) => {
  activeChatKeys.set(connectionId, key);
};

export const getChatKey = (connectionId) => {
  return activeChatKeys.get(connectionId);
};

export const clearChatKeys = () => {
  activeChatKeys.clear();
};

export const setGroupKey = (groupId, key) => {
  activeGroupKeys.set(groupId, key);
};

export const getGroupKey = (groupId) => {
  return activeGroupKeys.get(groupId);
};

export const clearGroupKeys = () => {
  activeGroupKeys.clear();
};

