import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api';

// ─── Validation schema ───────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    try {
      // Register the user via the API
      await api.post('/auth/register', values);
      toast.success('Account created successfully! Please sign in with your credentials.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
      const msg = respData?.error?.message ?? respData?.message ?? 'Registration failed. Please check your details and try again.';
      setApiError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Header text */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Create an account
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Join the platform and get started today
        </p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-md p-8 shadow-lg">
        {/* API error banner */}
        {apiError && (
          <div
            id="register-error-banner"
            className="mb-5 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            <span className="shrink-0">⚠</span>
            {apiError}
          </div>
        )}

        <form
          id="register-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5"
        >
          {/* Full Name */}
          <div>
            <label htmlFor="reg-name" className="form-label">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <User size={16} />
              </span>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                {...register('name')}
                className={`input-field ${errors.name ? 'input-field-error' : ''}`}
              />
            </div>
            {errors.name && (
              <p className="error-text">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="reg-email" className="form-label">
              Email address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <Mail size={16} />
              </span>
              <input
                id="reg-email"
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
            <label htmlFor="reg-password" className="form-label">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={16} />
              </span>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••••"
                {...register('password')}
                className={`input-field pr-10 ${errors.password ? 'input-field-error' : ''}`}
              />
              <button
                type="button"
                id="toggle-reg-password"
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

          {/* Submit */}
          <button
            id="register-submit"
            type="submit"
            disabled={isSubmitting}
            className="btn-primary mt-1"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Creating account…
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Back to login */}
        <div className="mt-6 flex items-center justify-center">
          <Link
            id="back-to-login"
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
