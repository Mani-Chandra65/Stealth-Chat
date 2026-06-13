import { base64ToArrayBuffer, arrayBufferToBase64 } from './helpers.js';

/**
 * Encrypts a raw AES key buffer using a base64-encoded SPKI RSA public key.
 * @param {ArrayBuffer} rawAesKey - The raw bytes of the symmetric AES key.
 * @param {string} spkiPublicKeyBase64 - The peer's base64-encoded public key.
 * @returns {Promise<string>} - The base64-encoded encrypted AES key ciphertext.
 */
export const encryptAESKeyForUser = async (rawAesKey, spkiPublicKeyBase64) => {
  const publicKeyDer = base64ToArrayBuffer(spkiPublicKeyBase64);
  const cryptoPublicKey = await window.crypto.subtle.importKey(
    "spki",
    publicKeyDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["encrypt"]
  );

  const encryptedBuf = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    cryptoPublicKey,
    rawAesKey
  );

  return arrayBufferToBase64(encryptedBuf);
};

/**
 * Generates a 256-bit AES-GCM symmetric key and encrypts it for both users.
 * @param {string} peerPublicKeyBase64 - The peer's public key.
 * @param {string} myPublicKeyBase64 - Our own public key.
 * @returns {Promise<{aesKey: CryptoKey, encryptedAESKeyUser1: string, encryptedAESKeyUser2: string}>}
 */
export const generateAndEncryptAESKeys = async (peerPublicKeyBase64, myPublicKeyBase64) => {
  // Generate a random 256-bit AES-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );

  // Export raw key bytes (32 bytes)
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // Encrypt for both users
  // User 1 is the requester (peer)
  // User 2 is the acceptor (current user)
  const encryptedAESKeyUser1 = await encryptAESKeyForUser(rawAesKey, peerPublicKeyBase64);
  const encryptedAESKeyUser2 = await encryptAESKeyForUser(rawAesKey, myPublicKeyBase64);

  return {
    aesKey,
    encryptedAESKeyUser1,
    encryptedAESKeyUser2
  };
};
