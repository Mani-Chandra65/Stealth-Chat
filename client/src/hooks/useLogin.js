import { useState } from 'react';
import { authService } from '../services/auth.service.js';
import { hashPassword } from '../utils/crypto/hashPassword.js';
import { saveEncryptedPrivateKey, savePublicKey } from '../utils/indexedDB.js';
import { decryptPrivateKey } from '../utils/crypto/decryptPrivateKey.js';
import { setPrivateKey } from '../store/cryptoStore.js';
import { useAuthStore } from '../store/authStore.js';
import { connectSocket } from '../lib/socket.js';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Attach directly to the Zustand store login dispatcher
  const authLogin = useAuthStore(state => state.login);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      // Re-hash the password identically as during registration
      const passwordHash = await hashPassword(password, email);

      const requestBody = {
        email: email,
        passwordHash: passwordHash, // Backend login controller expects 'password' key
      };

      const response = await authService.login(requestBody);

      if (response && response.accessToken) {
        // 1. Utilize Zustand strictly as the authoritative memory scope
        authLogin(response.user, response.accessToken);

        // 2. Store the encrypted private key and public key in IndexedDB
        if (response.user?.id) {
          if (response.encryptedPrivateKey) {
            await saveEncryptedPrivateKey(response.user.id, response.encryptedPrivateKey);
            
            // 3. Decrypt the private key using passwordHash and store the CryptoKey in memory
            try {
              const privateCryptoKey = await decryptPrivateKey(response.encryptedPrivateKey, passwordHash);
              setPrivateKey(privateCryptoKey);
            } catch (decryptionError) {
              console.error("Failed to decrypt private key:", decryptionError);
              throw new Error("Invalid decryption key or corrupted payload.");
            }
          }
          if (response.publicKey) {
            await savePublicKey(response.user.id, response.publicKey);
          }

        }

      }
      if (response && response.accessToken) {
        connectSocket(response.accessToken); // Connect to the socket server with the access token
      }

      return response;
    } catch (err) {
      const errorMessage =
        err.message ||
        err.error ||
        (err.errors ? err.errors.map(e => e.msg).join(', ') : 'Login failed. Please try again.');
      
      setError(errorMessage);
      throw new Error(errorMessage, { cause: err });
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};
