'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import FieldError from '@/components/ui/FieldError';
import { signupSchema } from '@/lib/validations';
import { useZodForm } from '@/hooks/useZodForm';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '';

  const { values: form, setValues: setForm, errors, handleChange, validate, setServerErrors } = useZodForm(
    { name: '', email: '', password: '', confirmPassword: '', phone: '' },
    signupSchema
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordChecks = {
    length: form.password.length >= 6,
    match: form.password && form.confirmPassword && form.password === form.confirmPassword,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const clientCheck = signupSchema.safeParse({
      name: form.name,
      email: form.email.trim(),
      password: form.password,
      phone: form.phone,
    });

    if (!clientCheck.success) {
      validate();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name ? form.name.trim() : null,
          email: form.email.trim(),
          password: form.password,
          phone: form.phone || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerErrors(data);
        setError(data.error || 'Something went wrong');
        return;
      }

      router.push(
        `/verify-otp?email=${encodeURIComponent(data.email)}${
          redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''
        }`
      );
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginLink = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white border border-warm-200 border-t-2 border-t-brand-500 rounded-md shadow-sm p-5 sm:p-6">
        {/* Header */}
        <h1 className="text-lg font-bold text-warm-900 tracking-tight">Create account</h1>
        <p className="text-[11px] text-warm-500 mt-1 mb-4">Join HodaHub for an elevated shopping experience</p>

        {/* Error Alert */}
        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label htmlFor="signup-name" className="block text-[10px] font-semibold text-warm-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
              <input
                id="signup-name"
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none transition-all ${
                  errors.name ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
                placeholder="John Doe"
              />
            </div>
            <FieldError message={errors.name} />
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-[10px] font-semibold text-warm-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
              <input
                id="signup-email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none transition-all ${
                  errors.email ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
                placeholder="you@example.com"
                required
              />
            </div>
            <FieldError message={errors.email} />
          </div>

          <div>
            <PhoneInput
              label="Mobile Phone Number"
              value={form.phone}
              onChange={(val) => handleChange('phone', val)}
              error={errors.phone}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="signup-password" className="block text-[10px] font-semibold text-warm-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`w-full pl-8 pr-8 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none transition-all ${
                    errors.password ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                  }`}
                  placeholder="Min. 6 chars"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <FieldError message={errors.password} />
            </div>

            <div>
              <label htmlFor="signup-confirm" className="block text-[10px] font-semibold text-warm-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
                <input
                  id="signup-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 transition-all"
                  placeholder="Re-enter"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {form.password && (
            <div className="flex items-center gap-3 text-[10px] pt-0.5">
              <div className={`flex items-center gap-1 ${passwordChecks.length ? 'text-emerald-600' : 'text-warm-400'}`}>
                <Check className="w-3 h-3" />
                <span>6+ characters</span>
              </div>
              {form.confirmPassword && (
                <div className={`flex items-center gap-1 ${passwordChecks.match ? 'text-emerald-600' : 'text-red-500'}`}>
                  <Check className="w-3 h-3" />
                  <span>Passwords match</span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="my-3 flex items-center gap-2 text-warm-400">
          <div className="flex-1 h-px bg-warm-200" />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-warm-500">OR</span>
          <div className="flex-1 h-px bg-warm-200" />
        </div>

        <button
          type="button"
          onClick={() => { window.location.href = '/api/auth/google'; }}
          className="w-full py-1.5 px-3 bg-white border border-warm-300 text-warm-800 text-[11px] font-semibold rounded-md hover:bg-warm-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-2xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        <div className="mt-4 pt-3 border-t border-warm-100 text-center">
          <p className="text-[11px] text-warm-500">
            Already have an account?{' '}
            <Link href={loginLink} className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm mx-auto p-6 text-center">
          <div className="w-4 h-4 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}