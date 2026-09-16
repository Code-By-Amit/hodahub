'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '';

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
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

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('All fields are required');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-[10px] font-semibold text-warm-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
              <input
                id="signup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="signup-password" className="block text-[10px] font-semibold text-warm-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-8 pr-8 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                  placeholder="Min. 6 chars"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="signup-confirm" className="block text-[10px] font-semibold text-warm-700 mb-1">
                Confirm
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
                <input
                  id="signup-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full pl-8 pr-8 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                  placeholder="Re-enter"
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
            className="w-full py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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