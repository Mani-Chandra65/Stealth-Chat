import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { hashPassword } from '../../utils/crypto/hashPassword.js';
import { getEncryptedPrivateKey } from '../../utils/indexedDB.js';
import { decryptPrivateKey } from '../../utils/crypto/decryptPrivateKey.js';
import { setPrivateKey } from '../../store/cryptoStore.js';
import { useAuthStore } from '../../store/authStore.js';

export default function UnlockVault({ onUnlock }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Directly pull user from the global state 
  const user = useAuthStore(state => state.user);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      if (!user) throw new Error("User session data missing from store");

      const passwordHash = await hashPassword(data.password, user.email);
      const encryptedKeyStr = await getEncryptedPrivateKey(user.id);
      
      if (!encryptedKeyStr) {
         throw new Error("Encrypted key missing from IndexedDB. Please fully log out and log in again.");
      }

      const cryptoKey = await decryptPrivateKey(encryptedKeyStr, passwordHash);
      setPrivateKey(cryptoKey);
      
      toast.success('Vault unlocked successfully!');
      onUnlock();
    } catch (err) {
      console.error("Unlock error:", err);
      toast.error('Incorrect password or corrupted local vault.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-dvh bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-3 mb-4 bg-blue-100 rounded-full">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Unlock Vault</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your session is active, but your encryption keys have left memory. Please enter your password to unlock your vault.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="password">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isLoading}
                className={`block w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                {...register('password', {
                  required: 'Password is required'
                })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Unlocking...
              </>
            ) : (
              'Unlock Vault'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
