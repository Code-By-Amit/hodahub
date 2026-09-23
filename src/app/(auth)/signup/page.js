'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '@/lib/store/authSlice';
import { selectWishlistItems } from '@/lib/store/wishlistSlice';
import { syncWishlistOnAuth } from '@/lib/store/syncWishlist';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Lock, Mail, Smartphone, User, ShieldCheck, RefreshCw } from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import FieldError from '@/components/ui/FieldError';
import { signupSchema } from '@/lib/validations';
import { useZodForm } from '@/hooks/useZodForm';
import { useMsg91Otp } from '@/hooks/useMsg91Otp';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const guestWishlistItems = useSelector(selectWishlistItems);
  const redirect = searchParams.get('redirect') || '';

  // MSG91 OTP Widget Hook
  const { sendOtp: msg91SendOtp, retryOtp: msg91RetryOtp, verifyOtp: msg91VerifyOtp } = useMsg91Otp();

  // Auth Tab: 'mobile' | 'email'
  const [authTab, setAuthTab] = useState('mobile');

  // Mobile + OTP States
  const [mobilePhone, setMobilePhone] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Email + Password Signup States
  const { values: form, errors, handleChange, validate, setServerErrors } = useZodForm(
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

  // Handle Mobile Send OTP (MSG91 OTP Widget)
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setOtpError('');
    setOtpMessage('');

    const clean10 = mobilePhone.replace(/\D/g, '').slice(-10);
    if (clean10.length !== 10 || !/^[6-9]\d{9}$/.test(clean10)) {
      setOtpError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setSendingOtp(true);
    try {
      const result = await msg91SendOtp(clean10);
      if (result.success) {
        setOtpSent(true);
        setResendCooldown(45);
        setOtpMessage('OTP code sent successfully to your mobile number');
      } else {
        setOtpError(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      setOtpError(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  }

  // Handle Resend OTP (MSG91 OTP Widget)
  async function handleResendOtp() {
    if (resendCooldown > 0 || resendingOtp) return;
    setOtpError('');
    setOtpMessage('');

    const clean10 = mobilePhone.replace(/\D/g, '').slice(-10);
    setResendingOtp(true);
    try {
      const result = await msg91RetryOtp(clean10);
      if (result.success) {
        setResendCooldown(45);
        setOtpMessage('OTP resent successfully!');
      } else {
        setOtpError(result.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setOtpError(error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendingOtp(false);
    }
  }

  // Handle Mobile Verify OTP (MSG91 OTP Widget + Backend verification)
  async function handleVerifyOtp(e) {
    if (e) e.preventDefault();
    setOtpError('');

    if (!mobileOtp || mobileOtp.trim().length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP code');
      return;
    }

    const clean10 = mobilePhone.replace(/\D/g, '').slice(-10);
    setVerifyingOtp(true);

    try {
      // 1. Verify via MSG91 OTP Widget ExposeMethods
      const msg91Result = await msg91VerifyOtp(mobileOtp.trim());

      // 2. Send token to backend to verify server-side & issue session cookies
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: clean10,
          accessToken: msg91Result.accessToken,
          otp: mobileOtp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || 'Failed to verify OTP with server');
        setVerifyingOtp(false);
        return;
      }

      dispatch(setUser(data.user));
      await syncWishlistOnAuth(dispatch, guestWishlistItems);

      if (data.user?.role === 'admin') {
        router.push('/admin');
      } else if (redirect) {
        router.push(redirect);
      } else {
        router.push('/');
      }
    } catch (error) {
      setOtpError(error.message || 'Network error verifying OTP. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  }

  // Handle Email Submit
  const handleEmailSubmit = async (e) => {
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
        <p className="text-[11px] text-warm-500 mt-0.5 mb-4">Join HodaHub for an elevated shopping experience</p>

        {/* Auth Option Tabs */}
        <div className="flex border-b border-warm-200 mb-4 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setAuthTab('mobile')}
            className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authTab === 'mobile'
                ? 'border-brand-600 text-brand-700 bg-brand-50/20'
                : 'border-transparent text-warm-500 hover:text-warm-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile OTP</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthTab('email')}
            className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authTab === 'email'
                ? 'border-brand-600 text-brand-700 bg-brand-50/20'
                : 'border-transparent text-warm-500 hover:text-warm-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>
        </div>

        {/* TAB 1: MOBILE + OTP */}
        {authTab === 'mobile' && (
          <div className="space-y-3">
            {otpError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{otpError}</span>
              </div>
            )}

            {otpMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-[11px] flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{otpMessage}</span>
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <PhoneInput
                  label="Mobile Phone Number"
                  value={mobilePhone}
                  onChange={(val) => setMobilePhone(val)}
                  error={otpError}
                />
                <button
                  type="submit"
                  disabled={sendingOtp}
                  className="w-full py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {sendingOtp ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send OTP & Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-semibold text-warm-700">
                      Enter 6-Digit OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpError('');
                        setOtpMessage('');
                      }}
                      className="text-[10px] text-brand-600 hover:underline"
                    >
                      Change Number
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={mobileOtp}
                    onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3 py-2 bg-white border border-warm-200 rounded-md text-[13px] font-mono tracking-widest text-center text-warm-900 focus:outline-none focus:border-brand-600 transition-all"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-warm-500">
                  <span>Didn&apos;t receive code?</span>
                  {resendCooldown > 0 ? (
                    <span className="font-medium text-warm-400">Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendingOtp}
                      className="text-brand-600 hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {resendingOtp ? (
                        <div className="w-3 h-3 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>Resend OTP</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={verifyingOtp}
                  className="w-full py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {verifyingOtp ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify & Create Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: EMAIL SIGNUP */}
        {authTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-2.5">
            {error && (
              <div className="mb-2 p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

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
        )}

        {/* GOOGLE OAUTH OPTION */}
        <div className="my-3 flex items-center gap-2 text-warm-400">
          <div className="flex-1 h-px bg-warm-200" />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-warm-500">OR</span>
          <div className="flex-1 h-px bg-warm-200" />
        </div>

        <button
          type="button"
          onClick={() => { window.location.href = '/api/auth/google'; }}
          className="w-full py-1.5 px-3 bg-white border border-warm-300 text-warm-800 text-[11px] font-semibold rounded-md hover:bg-warm-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
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
          <span>Sign up with Google</span>
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