'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import FieldError from '@/components/ui/FieldError';
import PasswordInput from '@/components/ui/PasswordInput';
import { ArrowLeft, ArrowRight, Lock, Mail, Key } from 'lucide-react';
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setStep(2);
    }
  }, [searchParams]);

  async function handleRequestCode(e) {
    e.preventDefault();
    setErrors({});

    const clientCheck = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!clientCheck.success) {
      setErrors({ email: clientCheck.error.issues[0]?.message });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Verification code sent!');
        setStep(2);
      } else {
        if (data.errors) setErrors(data.errors);
        toast.error(data.error || 'Failed to request reset code');
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setErrors({});

    const clientCheck = resetPasswordSchema.safeParse({ email: email.trim(), otp, newPassword });
    if (!clientCheck.success) {
      const errMap = {};
      clientCheck.error.issues.forEach((iss) => {
        if (iss.path[0]) errMap[iss.path[0]] = iss.message;
      });
      setErrors(errMap);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Password reset successfully!');
        router.push('/login');
      } else {
        if (data.errors) setErrors(data.errors);
        toast.error(data.error || 'Failed to reset password');
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white border border-warm-200 border-t-2 border-t-brand-500 rounded-md shadow-sm p-5 sm:p-6">
        <h1 className="text-lg font-bold text-warm-900 tracking-tight">
          {step === 1 ? 'Reset password' : 'Enter reset code'}
        </h1>
        <p className="text-[11px] text-warm-500 mt-1 mb-4">
          {step === 1
            ? 'Enter your account email to receive a 6-digit reset code'
            : `We sent a 6-digit code to ${email}`}
        </p>

        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                  className={`w-full pl-8 pr-3 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none transition-all ${
                    errors.email ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                  }`}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <FieldError message={errors.email} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Reset Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                6-Digit Reset Code *
              </label>
              <div className="relative">
                <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    if (errors.otp) setErrors((prev) => ({ ...prev, otp: null }));
                  }}
                  className={`w-full pl-8 pr-3 py-1.5 bg-white border rounded-md font-mono text-center tracking-widest text-[13px] font-bold text-warm-900 focus:outline-none transition-all ${
                    errors.otp ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                  }`}
                  placeholder="123456"
                  required
                />
              </div>
              <FieldError message={errors.otp} />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                New Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5 z-10 pointer-events-none" />
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null }));
                  }}
                  className={`pl-8 bg-white border rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none transition-all ${
                    errors.newPassword ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                  }`}
                  placeholder="••••••••"
                  required
                />
              </div>
              <FieldError message={errors.newPassword} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Set New Password</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-[11px] text-brand-600 font-medium hover:underline text-center block cursor-pointer"
            >
              Change email or resend code
            </button>
          </form>
        )}

        <div className="mt-4 pt-3 border-t border-warm-100 text-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 text-[11px] text-warm-500 hover:text-warm-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
