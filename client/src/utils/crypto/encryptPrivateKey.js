import { arrayBufferToBase64 } from './helpers.js';

export const encryptPrivateKey = async (privateKeyBase64, passwordHash) => {
  const enc = new TextEncoder();
  
  // Import password hash as a key material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passwordHash),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Generate random salt for PBKDF2 and IV for AES-GCM
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive an AES-GCM key from the PBKDF2 key material
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // Encrypt the private key
  const encryptedBuf = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    enc.encode(privateKeyBase64)
  );

  // Base64 encode the parameters
  const payload = {
    s: arrayBufferToBase64(salt),
    i: arrayBufferToBase64(iv),
    c: arrayBufferToBase64(encryptedBuf),
  };

  // Return a stringified payload that represents the encrypted private key
  return JSON.stringify(payload);
};
