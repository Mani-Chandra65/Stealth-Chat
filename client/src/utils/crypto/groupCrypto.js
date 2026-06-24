import { base64ToArrayBuffer, arrayBufferToBase64 } from "./helpers.js";
import { getGroupKey } from "../../store/cryptoStore.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Encrypts a text message using the symmetric key for a specific group.
 * @param {string} plaintext - The plaintext message content.
 * @param {string} groupId - The group UUID.
 * @returns {Promise<string>} - JSON string containing base64 ciphertext and IV.
 */
export const encryptGroupMessageContent = async (plaintext, groupId) => {
  const aesKey = getGroupKey(groupId);
  if (!aesKey) {
    throw new Error("Group symmetric key not found in memory (Vault is locked)");
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
 * Decrypts a text message using the symmetric key for a specific group.
 * @param {string} ciphertextJson - JSON string containing base64 ciphertext and IV.
 * @param {string} groupId - The group UUID.
 * @returns {Promise<string>} - The decrypted plaintext message.
 */
export const decryptGroupMessageContent = async (ciphertextJson, groupId) => {
  try {
    const aesKey = getGroupKey(groupId);
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
    console.error(`Failed to decrypt message for group ${groupId}:`, err);
    return "[Decryption failed - possibly corrupted payload]";
  }
};
