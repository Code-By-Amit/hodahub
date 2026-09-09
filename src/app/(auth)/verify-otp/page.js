'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '@/lib/store/authSlice';
import { selectWishlistItems } from '@/lib/store/wishlistSlice';
import { syncWishlistOnAuth } from '@/lib/store/syncWishlist';
import { AlertCircle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const guestWishlistItems = useSelector(selectWishlistItems);
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return;

    const digits = pastedData.split('');
    setOtp(digits);
    inputRefs.current[5]?.focus();
  };

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpString }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      setSuccess('Email verified successfully! Redirecting...');
      dispatch(setUser(data.user));
      await syncWishlistOnAuth(dispatch, guestWishlistItems);

      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [otp, email, dispatch, router]);

  useEffect(() => {
    if (otp.every((d) => d !== '') && otp.join('').length === 6) {
      handleSubmit();
    }
  }, [otp, handleSubmit]);

  const handleResend = async () => {
    if (!canResend) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend OTP');
        return;
      }

      setSuccess('A new OTP has been sent to your email!');
      setOtp(['', '', '', '', '', '']);
      setResendTimer(60);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } catch {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white border border-warm-200 border-t-2 border-t-brand-500 rounded-md shadow-sm p-5 sm:p-6">
        <h1 className="text-lg font-bold text-warm-900 tracking-tight">Verify your email</h1>
        <p className="text-[11px] text-warm-500 mt-1 mb-4">
          We&apos;ve sent a 6-digit code to <span className="font-medium text-warm-800">{email}</span>
        </p>

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 text-[11px] flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2 mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`w-9 h-10 text-center text-base font-bold rounded-md border bg-white transition-all focus:outline-none ${
                  digit
                    ? 'border-brand-600 ring-2 ring-brand-600/10 text-warm-900'
                    : 'border-warm-200 text-warm-400 focus:border-brand-600'
                }`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otp.some((d) => !d)}
            className="w-full py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Verify Email</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-3 text-center">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-[11px] text-brand-600 hover:text-brand-700 font-medium flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Resend OTP</span>
            </button>
          ) : (
            <p className="text-[11px] text-warm-400">
              Resend code in{' '}
              <span className="font-mono font-semibold text-warm-700">
                {String(Math.floor(resendTimer / 60)).padStart(2, '0')}:{String(resendTimer % 60).padStart(2, '0')}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white border border-warm-200 rounded-md shadow-sm p-6 text-center">
          <div className="w-4 h-4 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}