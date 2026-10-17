import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/useAuth';

// ─── Validation schema ───────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    try {
      await login(values.email, values.password);
      toast.success('Signed in successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
      const msg = respData?.error?.message ?? respData?.message ?? 'Invalid email or password. Please try again.';
      setApiError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Header text */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Welcome back
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Please sign in to your account
        </p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-md p-8 shadow-lg">
        {/* API error banner */}
        {apiError && (
          <div
            id="login-error-banner"
            className="mb-5 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            <span className="shrink-0">⚠</span>
            {apiError}
          </div>
        )}

        <form id="login-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="form-label">
              Email address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <Mail size={16} />
              </span>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
                className={`input-field ${errors.email ? 'input-field-error' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="error-text">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={16} />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••"
                {...register('password')}
                className={`input-field pr-10 ${errors.password ? 'input-field-error' : ''}`}
              />
              <button
                type="button"
                id="toggle-password-visibility"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-700 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="error-text">{errors.password.message}</p>
            )}
          </div>

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                id="remember-me"
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              Remember me
            </label>
            <Link
              id="forgot-password-link"
              to="/forgot-password"
              className="text-sm font-semibold text-gray-900 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={isSubmitting}
            className="btn-primary mt-1"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link
            id="signup-link"
            to="/register"
            className="font-semibold text-gray-900 hover:underline"
          >
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
