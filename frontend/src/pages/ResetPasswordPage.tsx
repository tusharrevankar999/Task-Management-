import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { authApi } from '../lib/api';

const schema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      setApiError('Missing password reset token. Please request a new link.');
      return;
    }

    setApiError(null);
    try {
      const { data } = await authApi.resetPassword({
        token,
        password: values.password,
      });
      setIsSuccess(true);
      toast.success(data.message || 'Password reset successfully!');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
      const msg = respData?.error?.message ?? respData?.message ?? 'Failed to reset password. The link may have expired.';
      setApiError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Create New Password
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Please enter and confirm your new password
        </p>
      </div>

      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
        {apiError && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {isSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Password Changed</h3>
            <p className="text-sm text-gray-500">
              Your password has been updated. Redirecting to login...
            </p>
            <div className="pt-4 border-t border-gray-100">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:underline"
              >
                Sign In Now
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
              >
                NEW PASSWORD
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </span>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-10 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:bg-white transition-colors ${
                    errors.password ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
              >
                CONFIRM NEW PASSWORD
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </span>
                <input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  className={`w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:bg-white transition-colors ${
                    errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              id="update-password-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating password...
                </>
              ) : (
                'Save New Password'
              )}
            </button>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={15} />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
