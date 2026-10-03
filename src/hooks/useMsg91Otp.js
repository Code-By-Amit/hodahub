'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatIndianMobile, extract10DigitMobile } from '@/lib/msg91';

const MSG91_SCRIPT_URL = 'https://verify.msg91.com/otp-provider.js';

/**
 * OTP State Machine:
 * 'idle' | 'sending' | 'otpSent' | 'verifying' | 'verified' | 'retrying' | 'error'
 */

export function useMsg91Otp({ captchaRenderId = 'msg91-captcha' } = {}) {
  const [otpState, setOtpState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Synchronously initialize configuration from NEXT_PUBLIC environment variables
  const [widgetId, setWidgetId] = useState(() => {
    return (process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || '').trim();
  });

  const [tokenAuth, setTokenAuth] = useState(() => {
    return (process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || '').trim();
  });

  const [isConfigured, setIsConfigured] = useState(() => {
    const wId = (process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || '').trim();
    const tAuth = (process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || '').trim();
    return Boolean(wId && tAuth);
  });

  const [isScriptLoaded, setIsScriptLoaded] = useState(() => {
    if (typeof window !== 'undefined') {
      return Boolean(window.initSendOTP || window.sendOtp);
    }
    return false;
  });

  const lastReqIdRef = useRef(null);
  const scriptLoadingRef = useRef(false);
  const isWidgetInitializedRef = useRef(false);

  const activeSuccessRef = useRef(null);
  const activeFailureRef = useRef(null);

  // Fallback async fetch for configuration if build-time env vars were omitted
  useEffect(() => {
    if (isConfigured) return;
    let isMounted = true;

    fetch('/api/auth/phone/widget-token')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.widgetId) setWidgetId(data.widgetId);
        if (data.tokenAuth) setTokenAuth(data.tokenAuth);
        if (data.isConfigured) setIsConfigured(true);
      })
      .catch((err) => {
        console.warn('[MSG91 Hook] Config fetch error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isConfigured]);

  // Load MSG91 Web SDK Script Idempotently
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.initSendOTP || window.sendOtp) return;
    if (scriptLoadingRef.current) return;
    scriptLoadingRef.current = true;

    const existingScript = document.querySelector(`script[src="${MSG91_SCRIPT_URL}"]`);
    if (existingScript) {
      const handleLoad = () => setIsScriptLoaded(true);
      existingScript.addEventListener('load', handleLoad);
      return () => existingScript.removeEventListener('load', handleLoad);
    }

    const script = document.createElement('script');
    script.src = MSG91_SCRIPT_URL;
    script.async = true;
    script.type = 'text/javascript';

    script.onload = () => {
      setIsScriptLoaded(true);
    };

    script.onerror = () => {
      console.error('[MSG91 Hook] Failed to load MSG91 SDK script');
      scriptLoadingRef.current = false;
    };

    document.head.appendChild(script);
  }, []);

  // Initialize MSG91 Widget Configuration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isScriptLoaded || !widgetId || !tokenAuth || !isConfigured) return;
    if (isWidgetInitializedRef.current) return;

    if (window.initSendOTP) {
      try {
        const config = {
          widgetId,
          tokenAuth,
          exposeMethods: true,
          captchaRenderId,
          success: (data) => {
            console.log('[MSG91 Widget Success Callback]:', data);
            if (activeSuccessRef.current) {
              activeSuccessRef.current(data);
            }
          },
          failure: (error) => {
            console.warn('[MSG91 Widget Failure Callback]:', error);
            if (activeFailureRef.current) {
              activeFailureRef.current(error);
            }
          },
        };

        window.initSendOTP(config);
        isWidgetInitializedRef.current = true;
        console.log('[MSG91 Hook] Widget initialized successfully.');
      } catch (err) {
        console.error('[MSG91 initSendOTP Exception]:', err);
      }
    }
  }, [isScriptLoaded, widgetId, tokenAuth, isConfigured, captchaRenderId]);

  // Reset state helper
  const resetState = useCallback(() => {
    setOtpState('idle');
    setErrorMessage('');
    setInfoMessage('');
  }, []);

  /**
   * Send OTP to phone number using MSG91 window.sendOtp
   */
  const sendOtp = useCallback(
    async (phone) => {
      const clean10 = extract10DigitMobile(phone);
      if (!clean10 || clean10.length !== 10 || !/^[6-9]\d{9}$/.test(clean10)) {
        const err = 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)';
        setErrorMessage(err);
        setOtpState('error');
        return { success: false, error: err };
      }

      if (otpState === 'sending' || otpState === 'verifying') {
        return { success: false, error: 'Operation already in progress' };
      }

      const formatted12 = formatIndianMobile(clean10);

      setOtpState('sending');
      setErrorMessage('');
      setInfoMessage('');

      return new Promise((resolve) => {
        if (typeof window === 'undefined') {
          setOtpState('error');
          setErrorMessage('Browser window is not available');
          return resolve({ success: false, error: 'Window not available' });
        }

        if (!isConfigured) {
          const err = 'MSG91 OTP service is not configured on the server. Please add MSG91 environment variables.';
          setOtpState('error');
          setErrorMessage(err);
          return resolve({ success: false, error: err });
        }

        let isSettled = false;

        const handleSuccess = (response) => {
          if (isSettled) return;
          isSettled = true;

          const reqId =
            typeof response === 'object' && response ? response.reqId || response.requestId : null;
          if (reqId) lastReqIdRef.current = reqId;

          setOtpState('otpSent');
          setInfoMessage('OTP code sent successfully to your mobile number');
          resolve({ success: true, reqId, raw: response });
        };

        const handleFailure = (error) => {
          if (isSettled) return;
          isSettled = true;

          const rawMsg =
            (typeof error === 'object' && error && (error.message || error.description || error.err || error.error)) ||
            (typeof error === 'string' ? error : null);

          const userFriendlyMsg = rawMsg
            ? `Unable to send OTP: ${rawMsg}`
            : 'Unable to send OTP. Please check the mobile number and try again.';

          console.warn('[MSG91 Send OTP Failed]:', error);
          setOtpState('error');
          setErrorMessage(userFriendlyMsg);
          resolve({ success: false, error: userFriendlyMsg });
        };

        activeSuccessRef.current = handleSuccess;
        activeFailureRef.current = handleFailure;

        if (window.sendOtp) {
          try {
            console.log(`[MSG91 Hook] Invoking window.sendOtp for ${formatted12}`);
            window.sendOtp(formatted12, handleSuccess, handleFailure);
            return;
          } catch (e) {
            console.error('[MSG91 window.sendOtp error]:', e);
            handleFailure(e);
            return;
          }
        }

        if (window.initSendOTP) {
          try {
            console.log(`[MSG91 Hook] Initializing SendOTP for ${formatted12}`);
            window.initSendOTP({
              widgetId,
              tokenAuth,
              identifier: formatted12,
              exposeMethods: true,
              captchaRenderId,
              success: (data) => {
                if (activeSuccessRef.current) activeSuccessRef.current(data);
              },
              failure: (error) => {
                if (activeFailureRef.current) activeFailureRef.current(error);
              },
            });
            return;
          } catch (e) {
            console.error('[MSG91 window.initSendOTP with identifier error]:', e);
            handleFailure(e);
            return;
          }
        }

        const notLoadedMsg = 'OTP Widget script is not ready yet. Please try again in a moment.';
        setOtpState('error');
        setErrorMessage(notLoadedMsg);
        resolve({ success: false, error: notLoadedMsg });
      });
    },
    [isConfigured, widgetId, tokenAuth, captchaRenderId, otpState]
  );

  /**
   * Resend / Retry OTP
   */
  const retryOtp = useCallback(
    async (phone) => {
      const clean10 = extract10DigitMobile(phone);
      if (!clean10 || clean10.length !== 10) {
        const err = 'Please enter a valid 10-digit mobile number';
        setErrorMessage(err);
        return { success: false, error: err };
      }

      if (otpState === 'retrying' || otpState === 'sending' || otpState === 'verifying') {
        return { success: false, error: 'Operation already in progress' };
      }

      const formatted12 = formatIndianMobile(clean10);

      setOtpState('retrying');
      setErrorMessage('');
      setInfoMessage('');

      return new Promise((resolve) => {
        if (typeof window === 'undefined' || !isConfigured) {
          setOtpState('error');
          setErrorMessage('OTP service not configured');
          return resolve({ success: false, error: 'Not configured' });
        }

        let isSettled = false;

        const handleSuccess = (response) => {
          if (isSettled) return;
          isSettled = true;
          setOtpState('otpSent');
          setInfoMessage('OTP code resent successfully!');
          resolve({ success: true, raw: response });
        };

        const handleFailure = (error) => {
          if (isSettled) return;
          isSettled = true;

          const rawMsg =
            (typeof error === 'object' && error && (error.message || error.description || error.err || error.error)) ||
            (typeof error === 'string' ? error : null);

          const userFriendlyMsg = rawMsg
            ? `Resend OTP failed: ${rawMsg}`
            : 'Unable to resend OTP. Please try again.';

          setOtpState('error');
          setErrorMessage(userFriendlyMsg);
          resolve({ success: false, error: userFriendlyMsg });
        };

        activeSuccessRef.current = handleSuccess;
        activeFailureRef.current = handleFailure;

        if (window.retryOtp) {
          try {
            console.log('[MSG91 Hook] Invoking window.retryOtp');
            window.retryOtp(null, handleSuccess, handleFailure, lastReqIdRef.current);
            return;
          } catch (e) {
            console.warn('[MSG91 window.retryOtp error, fallback to sendOtp]:', e);
          }
        }

        if (window.sendOtp) {
          try {
            window.sendOtp(formatted12, handleSuccess, handleFailure);
            return;
          } catch (e) {
            handleFailure(e);
            return;
          }
        }

        handleFailure('SDK retry method not available');
      });
    },
    [isConfigured, otpState]
  );

  /**
   * Verify OTP code via MSG91 widget & send accessToken to Next.js backend
   */
  const verifyOtp = useCallback(
    async (otp) => {
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

      setOtpState('verifying');
      setErrorMessage('');
      setInfoMessage('');

      return new Promise((resolve) => {
        if (typeof window === 'undefined' || !isConfigured) {
          setOtpState('error');
          setErrorMessage('Authentication service unavailable');
          return resolve({ success: false, error: 'Service unavailable' });
        }

        let isSettled = false;

        const handleSuccess = async (response) => {
          if (isSettled) return;
          isSettled = true;

          const accessToken =
            (typeof response === 'object' && response && (response['access-token'] || response.accessToken || response.token)) ||
            (typeof response === 'string' && response.length > 20 ? response : null);

          if (!accessToken) {
            console.error('[MSG91 Verify OTP Callback] No access token received from MSG91 widget:', response);
            setOtpState('error');
            setErrorMessage('OTP verification failed: Provider did not return an access token');
            return resolve({ success: false, error: 'No access token returned' });
          }

          // Send MSG91 Access Token to Next.js Backend for Server Verification
          try {
            console.log('[MSG91 Hook] Sending access token to server /api/auth/msg91/verify');
            const backendRes = await fetch('/api/auth/msg91/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken }),
            });

            const backendData = await backendRes.json();

            if (!backendRes.ok || !backendData.success) {
              const serverErr = backendData.error || 'Server token verification failed';
              setOtpState('error');
              setErrorMessage(serverErr);
              return resolve({ success: false, error: serverErr });
            }

            setOtpState('verified');
            setInfoMessage('Mobile number verified successfully!');
            return resolve({ success: true, user: backendData.user });
          } catch (serverException) {
            console.error('[MSG91 Backend Request Error]:', serverException);
            const err = 'Network error verifying token with backend server';
            setOtpState('error');
            setErrorMessage(err);
            return resolve({ success: false, error: err });
          }
        };

        const handleFailure = (error) => {
          if (isSettled) return;
          isSettled = true;

          const rawMsg =
            (typeof error === 'object' && error && (error.message || error.description || error.err || error.error)) ||
            (typeof error === 'string' ? error : null);

          const userFriendlyMsg = rawMsg
            ? `OTP Verification Failed: ${rawMsg}`
            : 'OTP verification failed. Please check the code and try again.';

          console.warn('[MSG91 Verify OTP Widget Failure]:', error);
          setOtpState('error');
          setErrorMessage(userFriendlyMsg);
          resolve({ success: false, error: userFriendlyMsg });
        };

        activeSuccessRef.current = handleSuccess;
        activeFailureRef.current = handleFailure;

        if (window.verifyOtp) {
          try {
            console.log('[MSG91 Hook] Invoking window.verifyOtp');
            window.verifyOtp(cleanOtp, handleSuccess, handleFailure, lastReqIdRef.current);
            return;
          } catch (e) {
            console.error('[MSG91 window.verifyOtp exception]:', e);
            handleFailure(e);
            return;
          }
        }

        const noMethodErr = 'MSG91 OTP verification method not attached yet. Please wait for SDK to load.';
        setOtpState('error');
        setErrorMessage(noMethodErr);
        resolve({ success: false, error: noMethodErr });
      });
    },
    [isConfigured, otpState]
  );

  return {
    otpState,
    errorMessage,
    infoMessage,
    isScriptLoaded,
    isConfigured,
    resetState,
    sendOtp,
    retryOtp,
    verifyOtp,
  };
}
