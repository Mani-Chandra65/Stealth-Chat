import { useState } from 'react';
import { authService } from '../services/auth.service.js';
import { hashPassword } from '../utils/crypto/hashPassword.js';
import { generateKeyPair } from '../utils/crypto/generateKeyPair.js';
import { encryptPrivateKey } from '../utils/crypto/encryptPrivateKey.js';

export const useRegister = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const register = async (username, email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Hash the password using argon2
      const passwordHash = await hashPassword(password, email);

      // 2. Generate RSA key pair
      const { publicKey, privateKey } = await generateKeyPair();

      // 3. Encrypt the private key with the user's passwordHash
      const encryptedPrivateKey = await encryptPrivateKey(privateKey, passwordHash);

      const requestBody = {
        user_name: username,
        email: email,
        passwordHash: passwordHash,
        publicKey: publicKey,
        encryptedPrivateKey: encryptedPrivateKey,
      };

      // 4. Send to server
      const response = await authService.register(requestBody);

      return response;
    } catch (err) {
      // Handle various error formats
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        err.error ||
        (err.errors ? err.errors.map(e => e.msg).join(', ') : 'Registration failed. Please try again.');
      
      setError(errorMessage);
      throw new Error(errorMessage, { cause: err });
    } finally {
      setIsLoading(false);
    }
  };

  return { register, isLoading, error };
};
