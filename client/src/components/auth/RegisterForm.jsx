import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRegister } from '../../hooks/useRegister.js';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function RegisterForm() {
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();
  const { register: registerUser, isLoading, error } = useRegister();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      // data.password is passed down; we'll clear it after use in logic if needed
      await registerUser(data.username, data.email, data.password);
      
      // Clear sensitive info from the form
      reset();
      
      toast.success('Registration successful!');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Create an Account</h2>
        <p className="mt-2 text-sm text-gray-600">Join our secure chat application</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="username">
            Username
          </label>
          <div className="mt-1">
            <input
              id="username"
              type="text"
              autoComplete="username"
              disabled={isLoading}
              className={`block w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('username', {
                required: 'Username is required',
                minLength: { value: 3, message: 'Minimum 3 characters required' }
              })}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="email">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isLoading}
              className={`block w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: 'Invalid email address'
                }
              })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="password">
            Password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isLoading}
              className={`block w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters required' }
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
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <div className="relative mt-1">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isLoading}
              className={`block w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === password || 'The passwords do not match'
              })}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Registering...
            </>
          ) : (
            'Register'
          )}
        </button>
      </form>
    </div>
  );
}
