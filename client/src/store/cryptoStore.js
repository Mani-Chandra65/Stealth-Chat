// Singleton to keep CryptoKey in memory without persisting it directly to LocalStorage
let decyptedPrivateKey = null;

export const setPrivateKey = (key) => {
  decyptedPrivateKey = key;
};

export const getPrivateKey = () => {
  return decyptedPrivateKey;
};

export const clearPrivateKey = () => {
  decyptedPrivateKey = null;
};
