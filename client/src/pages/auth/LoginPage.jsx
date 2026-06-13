import { Toaster } from 'react-hot-toast';
import LoginForm from '../../components/auth/LoginForm.jsx';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-dvh px-4 py-12 bg-gray-50 sm:px-6 lg:px-8">
      {/* Toaster for notifications */}
      <Toaster position="top-right" />
      <LoginForm />
    </div>
  );
}
