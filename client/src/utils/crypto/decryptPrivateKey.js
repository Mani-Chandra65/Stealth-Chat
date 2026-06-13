import { base64ToArrayBuffer } from './helpers.js';

export const decryptPrivateKey = async (encryptedPayloadJSON, passwordHash) => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  
  const payload = JSON.parse(encryptedPayloadJSON);
  
  const salt = base64ToArrayBuffer(payload.s);
  const iv = base64ToArrayBuffer(payload.i);
  const encryptedBuf = base64ToArrayBuffer(payload.c);

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passwordHash),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

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
    ["decrypt"]
  );

  const decryptedBuf = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    encryptedBuf
  );

  const privateKeyBase64 = dec.decode(decryptedBuf);
  const privateKeyDer = base64ToArrayBuffer(privateKeyBase64);

  const privateCryptoKey = await window.crypto.subtle.importKey(
    "pkcs8",
    privateKeyDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true, // keep true if we ever need to export it again, but false is safer for pure memory usage
    ["decrypt"]
  );

  return privateCryptoKey;
};
