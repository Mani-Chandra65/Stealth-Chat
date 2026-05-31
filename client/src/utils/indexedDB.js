import { openDB } from 'idb';

const dbPromise = openDB('chat_app_db', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('key_store')) {
      db.createObjectStore('key_store');
    }
  },
});

export const saveEncryptedPrivateKey = async (userId, encryptedKey) => {
  const db = await dbPromise;
  await db.put('key_store', encryptedKey, `private_key_${userId}`);
};

export const getEncryptedPrivateKey = async (userId) => {
  const db = await dbPromise;
  return await db.get('key_store', `private_key_${userId}`);
};

export const removeEncryptedPrivateKey = async (userId) => {
  const db = await dbPromise;
  await db.delete('key_store', `private_key_${userId}`);
};

export const savePublicKey = async (userId, publicKey) => {
  const db = await dbPromise;
  await db.put('key_store', publicKey, `public_key_${userId}`);
};

export const getPublicKey = async (userId) => {
  const db = await dbPromise;
  return await db.get('key_store', `public_key_${userId}`);
};

export const removePublicKey = async (userId) => {
  const db = await dbPromise;
  await db.delete('key_store', `public_key_${userId}`);
};
