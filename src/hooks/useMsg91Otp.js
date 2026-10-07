'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatIndianMobile, extract10DigitMobile } from '@/lib/msg91';

const MSG91_SCRIPT_URL = 'https://verify.msg91.com/otp-provider.js';

/**
 * MSG91 OTP Widget Hook
 *
 * Architecture (per official MSG91 SDK internals & docs):
 *  1. Load otp-provider.js script ONCE.
 *  2. Call initSendOTP() ONCE. When exposeMethods: true is set, captchaRenderId
 *     MUST NOT be passed so MSG91 SDK can perform headless captcha verification
 *     automatically inside requestOTP.
 *  3. After initSendOTP resolves, window.sendOtp / window.verifyOtp / window.retryOtp
 *     are available on window.
 *  4. Use window.sendOtp(identifier, successCb, failureCb) to trigger OTP.
 *  5. Use window.retryOtp(channelValue, successCb, failureCb) to resend:
 *       - '12' = WhatsApp, '11' = SMS, '4' = Voice
 *  6. Use window.verifyOtp(otp, successCb, failureCb, reqId) to verify.
 *
 * OTP State Machine:
 * 'idle' | 'sending' | 'otpSent' | 'verifying' | 'verified' | 'retrying' | 'error'
 */

// Module-level singleton guards — survive React re-renders and Strict Mode double-effects
let _scriptAppended = false;
let _widgetInitialized = false;

export function useMsg91Otp() {
  const [otpState, setOtpState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Read widget config from NEXT_PUBLIC env vars (baked in at build time on client)
  const widgetId = (process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || '').trim();
  const tokenAuth = (process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || '').trim();
  const isConfigured = Boolean(widgetId && tokenAuth);

  // Track whether the SDK methods are ready to use
  const [sdkReady, setSdkReady] = useState(false);
  const lastReqIdRef = useRef(null);

  // Shared callback refs so they can be replaced per-operation without re-initializing the widget
  const successCallbackRef = useRef(null);
  const failureCallbackRef = useRef(null);

  /**
   * STEP 1 & 2: Load script and call initSendOTP exactly once.
   *
   * CRITICAL: When exposeMethods: true is enabled, captchaRenderId MUST NOT be passed.
   * Passing captchaRenderId causes MSG91's requestOTP internal method to check for
   * an explicit captcha token that is never generated in custom UI mode, causing
   * window.sendOtp to hang silently with no network call.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isConfigured) {
      console.warn('[MSG91] widgetId or tokenAuth missing from env vars. OTP will not work.');
      return;
    }

    // If SDK already initialized (e.g. React Strict Mode double-effect), just check readiness
    if (_widgetInitialized) {
      if (window.sendOtp) setSdkReady(true);
      return;
    }

    const doInit = () => {
      if (_widgetInitialized) return;
      _widgetInitialized = true;

      if (!window.initSendOTP) {
        console.error('[MSG91] initSendOTP is not defined after script load. SDK failed to load.');
        return;
      }

      console.log('[MSG91] Calling initSendOTP once with widgetId:', widgetId);
      try {
        window.initSendOTP({
          widgetId,
          tokenAuth,
          exposeMethods: true,        // Exposes window.sendOtp, window.verifyOtp, window.retryOtp
          // Note: captchaRenderId intentionally omitted so headless captcha runs inside MSG91 SDK
          success: (data) => {
            console.log('[MSG91 widget success callback]', data);
            if (successCallbackRef.current) successCallbackRef.current(data);
          },
          failure: (err) => {
            console.warn('[MSG91 widget failure callback]', err);
            if (failureCallbackRef.current) failureCallbackRef.current(err);
          },
        });
        console.log('[MSG91] initSendOTP called. Waiting for window.sendOtp to be exposed...');

        // Poll briefly for window.sendOtp to appear (usually within ~200ms)
        let attempts = 0;
        const poll = setInterval(() => {
          attempts++;
          if (window.sendOtp) {
            clearInterval(poll);
            console.log('[MSG91] window.sendOtp is now available. SDK ready.');
            setSdkReady(true);
          } else if (attempts >= 30) {
            clearInterval(poll);
            console.error('[MSG91] window.sendOtp not exposed after 3s. Check widgetId and tokenAuth in MSG91 dashboard.');
          }
        }, 100);
      } catch (err) {
        _widgetInitialized = false; // Allow retry
        console.error('[MSG91] initSendOTP threw an exception:', err);
      }
    };

    if (_scriptAppended) {
      if (window.initSendOTP) {
        doInit();
      }
      return;
    }

    const existing = document.querySelector(`script[src="${MSG91_SCRIPT_URL}"]`);
    if (existing) {
      _scriptAppended = true;
      if (window.initSendOTP) {
        doInit();
      } else {
        existing.addEventListener('load', doInit, { once: true });
      }
      return;
    }

    _scriptAppended = true;
    const script = document.createElement('script');
    script.src = MSG91_SCRIPT_URL;
    script.async = true;
    script.addEventListener('load', doInit, { once: true });
    script.addEventListener('error', () => {
      _scriptAppended = false;
      _widgetInitialized = false;
      console.error('[MSG91] Failed to load otp-provider.js from', MSG91_SCRIPT_URL);
    }, { once: true });
    document.head.appendChild(script);
    console.log('[MSG91] otp-provider.js script tag appended to <head>.');
  }, [isConfigured, widgetId, tokenAuth]);

  const resetState = useCallback(() => {
    setOtpState('idle');
    setErrorMessage('');
    setInfoMessage('');
    lastReqIdRef.current = null;
  }, []);

  /**
   * STEP 3: Send OTP via window.sendOtp
   * identifier = '91XXXXXXXXXX' (country code + 10 digit number, no '+')
   */
  const sendOtp = useCallback(async (phone) => {
    const clean10 = extract10DigitMobile(phone);
    if (!clean10 || clean10.length !== 10 || !/^[6-9]\d{9}$/.test(clean10)) {
      const err = 'Please enter a valid 10-digit Indian mobile number';
      setErrorMessage(err);
      setOtpState('error');
      return { success: false, error: err };
    }

    if (otpState === 'sending' || otpState === 'verifying') {
      return { success: false, error: 'Operation already in progress' };
    }

    if (!isConfigured) {
      const err = 'OTP service not configured. Check MSG91 environment variables.';
      setErrorMessage(err);
      setOtpState('error');
      return { success: false, error: err };
    }

    const formatted12 = formatIndianMobile(clean10); // e.g. '919876543210'

    setOtpState('sending');
    setErrorMessage('');
    setInfoMessage('');

    console.log(`[MSG91] sendOtp → window.sendOtp('${formatted12}')`);

    return new Promise((resolve) => {
      if (!window.sendOtp) {
        const errMsg = sdkReady
          ? 'MSG91 widget method lost. Please refresh and try again.'
          : 'MSG91 OTP widget is still loading. Please wait a moment and try again.';
        console.error('[MSG91] window.sendOtp is not defined.', { sdkReady });
        setOtpState('error');
        setErrorMessage(errMsg);
        return resolve({ success: false, error: errMsg });
      }

      let settled = false;

      // 15-second safety timeout so UI never hangs indefinitely in infinite spinner
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        successCallbackRef.current = null;
        failureCallbackRef.current = null;
        const errMsg = 'OTP request timed out. Please check your network connection and try again.';
        console.error('[MSG91] sendOtp timed out after 15s.');
        setOtpState('error');
        setErrorMessage(errMsg);
        resolve({ success: false, error: errMsg });
      }, 15000);

      const onSuccess = (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        successCallbackRef.current = null;
        failureCallbackRef.current = null;

        console.log('[MSG91] sendOtp success response:', JSON.stringify(response));

        const reqId = response?.reqId || response?.requestId || null;
        if (reqId) {
          lastReqIdRef.current = reqId;
          console.log('[MSG91] Saved reqId:', reqId);
        }

        setOtpState('otpSent');
        setInfoMessage('OTP sent successfully to your WhatsApp / mobile number');
        resolve({ success: true, reqId: lastReqIdRef.current, raw: response });
      };

      const onFailure = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        successCallbackRef.current = null;
        failureCallbackRef.current = null;

        const msg =
          error?.message || error?.description || error?.err ||
          (typeof error === 'string' ? error : 'Unable to send OTP. Please try again.');

        console.warn('[MSG91] sendOtp failure:', JSON.stringify(error));
        setOtpState('error');
        setErrorMessage(`Unable to send OTP: ${msg}`);
        resolve({ success: false, error: msg });
      };

      // Wire up refs so the global widget callbacks relay here
      successCallbackRef.current = onSuccess;
      failureCallbackRef.current = onFailure;

      try {
        window.sendOtp(formatted12, onSuccess, onFailure);
      } catch (e) {
        onFailure(e);
      }
    });
  }, [isConfigured, otpState, sdkReady]);

  /**
   * Resend OTP via WhatsApp (channel '12') or SMS ('11')
   * Per MSG91 docs: window.retryOtp(channelValue, successCb, failureCb)
   * Channel codes: '12'=WhatsApp, '11'=SMS, '4'=Voice, '3'=Email
   */
  const retryOtp = useCallback(async (phone, channel = '12') => {
    const clean10 = extract10DigitMobile(phone);
    if (!clean10 || clean10.length !== 10) {
      const err = 'Please enter a valid 10-digit mobile number';
      setErrorMessage(err);
      return { success: false, error: err };
    }

    if (otpState === 'retrying' || otpState === 'sending' || otpState === 'verifying') {
      return { success: false, error: 'Operation already in progress' };
    }

    if (!isConfigured) {
      const err = 'OTP service not configured';
      setErrorMessage(err);
      return { success: false, error: err };
    }

    setOtpState('retrying');
    setErrorMessage('');
    setInfoMessage('');

    const channelLabel = channel === '12' ? 'WhatsApp' : channel === '11' ? 'SMS' : `channel ${channel}`;
    console.log(`[MSG91] retryOtp → window.retryOtp('${channel}') [${channelLabel}]`);

    return new Promise((resolve) => {
      if (!window.retryOtp && !window.sendOtp) {
        const err = 'MSG91 SDK not ready. Please refresh and try again.';
        setOtpState('error');
        setErrorMessage(err);
        return resolve({ success: false, error: err });
      }

      let settled = false;

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        successCallbackRef.current = null;
        failureCallbackRef.current = null;
        const errMsg = 'OTP resend timed out. Please check your internet connection and try again.';
        console.error('[MSG91] retryOtp timed out after 15s.');
        setOtpState('error');
        setErrorMessage(errMsg);
        resolve({ success: false, error: errMsg });
      }, 15000);

      const onSuccess = (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        successCallbackRef.current = null;
        failureCallbackRef.current = null;
        console.log('[MSG91] retryOtp success:', JSON.stringify(response));
        setOtpState('otpSent');
        setInfoMessage(`OTP resent via ${channelLabel}!`);
        resolve({ success: true, raw: response });
      };

      const onFailure = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        successCallbackRef.current = null;
        failureCallbackRef.current = null;
        const msg =
          error?.message || error?.description ||
          (typeof error === 'string' ? error : 'Unable to resend OTP. Please try again.');
        console.warn('[MSG91] retryOtp failure:', JSON.stringify(error));
        setOtpState('error');
        setErrorMessage(`Resend failed: ${msg}`);
        resolve({ success: false, error: msg });
      };

      successCallbackRef.current = onSuccess;
      failureCallbackRef.current = onFailure;

      try {
        if (window.retryOtp) {
          window.retryOtp(channel, onSuccess, onFailure);
        } else {
          const formatted12 = formatIndianMobile(clean10);
          window.sendOtp(formatted12, onSuccess, onFailure);
        }
      } catch (e) {
        onFailure(e);
      }
    });
  }, [isConfigured, otpState]);

  /**
   * STEP 4: Verify OTP via window.verifyOtp
   * Per MSG91 docs: window.verifyOtp(otp, successCb, failureCb, reqId)
   * On success, the callback receives an access-token to verify server-side.
   */
  const verifyOtp = useCallback(async (otp) => {
    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      const err = 'Please enter a valid 6-digit OTP code';
      setErrorMessage(err);
      setOtpState('error');
      return { success: false, error: err };
    }

    if (otpState === 'verifying') {
      return { success: false, error: 'Verification already in progress' };
    }

    if (!isConfigured) {
      const err = 'OTP service not configured';
      setErrorMessage(err);
      setOtpState('error');
      return { success: false, error: err };
    }

    setOtpState('verifying');
    setErrorMessage('');
    setInfoMessage('');

    console.log(`[MSG91] verifyOtp → window.verifyOtp('${cleanOtp}', ..., reqId=${lastReqIdRef.current})`);

    return new Promise((resolve) => {
      if (!window.verifyOtp) {
        const err = 'MSG91 verify method not ready. Please refresh and try again.';
        console.error('[MSG91] window.verifyOtp is not defined');
        setOtpState('error');
        setErrorMessage(err);
        return resolve({ success: false, error: err });
      }

      let settled = false;

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        successCallbackRef.current = null;
        failureCallbackRef.current = null;
        const errMsg = 'OTP verification timed out. Please check your internet connection and try again.';
        console.error('[MSG91] verifyOtp timed out after 15s.');
        setOtpState('error');
        setErrorMessage(errMsg);
        resolve({ success: false, error: errMsg });
      }, 15000);

      const onSuccess = async (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        successCallbackRef.current = null;
        failureCallbackRef.current = null;

        console.log('[MSG91] verifyOtp widget success:', JSON.stringify(response));

        const accessToken =
          response?.['access-token'] || response?.accessToken ||
          response?.token || response?.jwt ||
          (typeof response === 'string' && response.length > 15 ? response : null);

        if (!accessToken) {
          console.error('[MSG91] No access token in verify response:', response);
          const err = 'Verification failed: No access token received from OTP provider';
          setOtpState('error');
          setErrorMessage(err);
          return resolve({ success: false, error: err });
        }

        // Server-side token verification
        try {
          console.log('[MSG91] Verifying access token server-side...');
          const res = await fetch('/api/auth/msg91/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken }),
          });

          const data = await res.json();
          console.log('[MSG91] Server verify response:', res.status, JSON.stringify(data));

          if (!res.ok || !data.success) {
            const err = data.error || 'Server-side token verification failed';
            setOtpState('error');
            setErrorMessage(err);
            return resolve({ success: false, error: err });
          }

          setOtpState('verified');
          setInfoMessage('Mobile number verified successfully!');
          return resolve({ success: true, user: data.user });
        } catch (networkErr) {
          console.error('[MSG91] Server verify network error:', networkErr);
          const err = 'Network error during verification. Please try again.';
          setOtpState('error');
          setErrorMessage(err);
          return resolve({ success: false, error: err });
        }
      };

      const onFailure = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        successCallbackRef.current = null;
        failureCallbackRef.current = null;

        const msg =
          error?.message || error?.description || error?.err ||
          (typeof error === 'string' ? error : 'Incorrect OTP. Please try again.');

        console.warn('[MSG91] verifyOtp failure:', JSON.stringify(error));
        setOtpState('error');
        setErrorMessage(`OTP verification failed: ${msg}`);
        resolve({ success: false, error: msg });
      };

      successCallbackRef.current = onSuccess;
      failureCallbackRef.current = onFailure;

      try {
        window.verifyOtp(cleanOtp, onSuccess, onFailure, lastReqIdRef.current);
      } catch (e) {
        onFailure(e);
      }
    });
  }, [isConfigured, otpState]);

  return {
    otpState,
    errorMessage,
    infoMessage,
    sdkReady,
    isConfigured,
    resetState,
    sendOtp,
    retryOtp,  // call with channel='12' for WhatsApp, '11' for SMS
    verifyOtp,
  };
}
