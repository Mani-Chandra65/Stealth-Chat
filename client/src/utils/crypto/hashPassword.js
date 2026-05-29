import { argon2id } from 'hash-wasm';

export const hashPassword = async (password, email) => {
  // Use email as salt for determinism across sessions so the hash matches on login
  // Note: the salt must be at least 8 bytes. Let's pad it if too short or hash the email.
  const enc = new TextEncoder();
  
  // Create a 16-byte salt from the email (simple SHA-256 then take first 16 bytes)
  const emailBuffer = enc.encode(email.toLowerCase());
  const emailHash = await window.crypto.subtle.digest('SHA-256', emailBuffer);
  const salt = new Uint8Array(emailHash, 0, 16);

  const hash = await argon2id({
    password: password,
    salt: salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 2048, // 2MB
    hashLength: 32,
    outputType: 'hex'
  });
  
  return hash;
};
