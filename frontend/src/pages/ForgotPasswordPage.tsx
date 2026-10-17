import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { authApi } from '../lib/api';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    try {
      const { data } = await authApi.forgotPassword(values.email);
      setIsSuccess(true);
      toast.success(data.message || 'Reset link sent successfully!');
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
      const msg = respData?.error?.message ?? respData?.message ?? 'Failed to send reset link. Please try again.';
      setApiError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Title & subtitle directly matching user's mock */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Reset Password
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Enter your email to receive a secure recovery token
        </p>
      </div>

      {/* Card with subtle rounded border and shadow */}
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
        {apiError && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {isSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 bg-gray-100 text-gray-900 rounded-full flex items-center justify-center mx-auto">
              <Mail size={24} />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Check your inbox</h3>
            <p className="text-sm text-gray-600">
              A secure password reset link has been sent to your email address. Please follow the instructions to set a new password.
            </p>
            <div className="pt-4 border-t border-gray-100">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
              >
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  {...register('email')}
                  className={`w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:bg-white transition-colors ${
                    errors.email ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Black theme primary button replacing red */}
            <button
              id="send-reset-link-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            {/* Back to Login link */}
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
