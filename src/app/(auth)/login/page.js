'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '@/lib/store/authSlice';
import { selectWishlistItems } from '@/lib/store/wishlistSlice';
import { syncWishlistOnAuth } from '@/lib/store/syncWishlist';
import { AlertCircle, ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const guestWishlistItems = useSelector(selectWishlistItems);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification) {
          router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
          return;
        }
        setError(data.error || 'Login failed');
        return;
      }

      dispatch(setUser(data.user));
      await syncWishlistOnAuth(dispatch, guestWishlistItems);

      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white border border-warm-200 border-t-2 border-t-brand-500 rounded-md shadow-sm p-5 sm:p-6">
        {/* Header */}
        <h1 className="text-lg font-bold text-warm-900 tracking-tight">Welcome back</h1>
        <p className="text-[11px] text-warm-500 mt-1 mb-4">Sign in to continue to HodaHub</p>

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
            <label htmlFor="login-email" className="block text-[10px] font-semibold text-warm-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
              <input
                id="login-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="block text-[10px] font-semibold text-warm-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[10px] text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-8 pr-9 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-warm-100 text-center">
          <p className="text-[11px] text-warm-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}