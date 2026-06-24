import { base64ToArrayBuffer, arrayBufferToBase64 } from "./helpers.js";
import { getChatKey } from "../../store/cryptoStore.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Encrypts a text message using the symmetric key for a specific connection.
 * @param {string} plaintext - The plaintext message content.
 * @param {string} connectionId - The chat connection UUID.
 * @returns {Promise<string>} - JSON string containing base64 ciphertext and IV.
 */
export const encryptMessageContent = async (plaintext, connectionId) => {
  const aesKey = getChatKey(connectionId);
  if (!aesKey) {
    throw new Error("Chat symmetric key not found in memory (Vault is locked)");
  }

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintextBuf = encoder.encode(plaintext);

  const ciphertextBuf = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    plaintextBuf
  );

  return JSON.stringify({
    c: arrayBufferToBase64(ciphertextBuf),
    i: arrayBufferToBase64(iv),
  });
};

/**
 * Decrypts a text message using the symmetric key for a specific connection.
 * @param {string} ciphertextJson - JSON string containing base64 ciphertext and IV.
 * @param {string} connectionId - The chat connection UUID.
 * @returns {Promise<string>} - The decrypted plaintext message.
 */
export const decryptMessageContent = async (ciphertextJson, connectionId) => {
  try {
    const aesKey = getChatKey(connectionId);
    if (!aesKey) {
      return "[Encrypted Message - Vault Locked]";
    }

    const payload = JSON.parse(ciphertextJson);
    if (!payload.c || !payload.i) {
      return "[Invalid encrypted payload format]";
    }

    const ciphertextBuf = base64ToArrayBuffer(payload.c);
    const iv = base64ToArrayBuffer(payload.i);

    const decryptedBuf = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      ciphertextBuf
    );

    return decoder.decode(decryptedBuf);
  } catch (err) {
    console.error(`Failed to decrypt message for connection ${connectionId}:`, err);
    return "[Decryption failed - possibly corrupted payload]";
  }
};

/**
 * Encrypts a media file before upload. Generates a unique key/IV for the file.
 * @param {File} file - The file to encrypt.
 * @returns {Promise<{encryptedBlob: Blob, fileKeyBase64: string, ivBase64: string}>}
 */
export const encryptMediaFile = async (file) => {
  // 1. Generate random 256-bit AES-GCM key for this file
  const fileKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Generate random 12-byte IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3. Read file buffer
  const fileBytes = await file.arrayBuffer();

  // 4. Encrypt file bytes
  const encryptedBuf = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    fileKey,
    fileBytes
  );

  // 5. Export file key to raw bytes
  const rawFileKey = await window.crypto.subtle.exportKey("raw", fileKey);

  return {
    encryptedBlob: new Blob([encryptedBuf], { type: "application/octet-stream" }),
    fileKeyBase64: arrayBufferToBase64(rawFileKey),
    ivBase64: arrayBufferToBase64(iv),
  };
};

/**
 * Decrypts an encrypted media file buffer.
 * @param {ArrayBuffer} encryptedBuffer - The downloaded encrypted buffer.
 * @param {string} fileKeyBase64 - The base64 file key.
 * @param {string} ivBase64 - The base64 IV.
 * @returns {Promise<ArrayBuffer>} - The decrypted file buffer.
 */
export const decryptMediaFile = async (encryptedBuffer, fileKeyBase64, ivBase64) => {
  const rawFileKey = base64ToArrayBuffer(fileKeyBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  // 1. Import file key
  const fileKey = await window.crypto.subtle.importKey(
    "raw",
    rawFileKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["decrypt"]
  );

  // 2. Decrypt
  return window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    fileKey,
    encryptedBuffer
  );
};
