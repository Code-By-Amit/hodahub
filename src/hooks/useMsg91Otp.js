'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatIndianMobile, extract10DigitMobile } from '@/lib/msg91';

const MSG91_SCRIPT_URL = 'https://verify.msg91.com/otp-provider.js';
const OPERATION_TIMEOUT_MS = 15000; // 15s safety timeout to prevent infinite spinners

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

    console.log('[MSG91 Hook] Config missing on client, fetching from server...');
    fetch('/api/auth/phone/widget-token')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.widgetId) setWidgetId(data.widgetId);
        if (data.tokenAuth) setTokenAuth(data.tokenAuth);
        if (data.isConfigured) {
          setIsConfigured(true);
          console.log('[MSG91 Hook] Configuration loaded asynchronously from server.');
        }
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
    if (window.initSendOTP || window.sendOtp) {
      setIsScriptLoaded(true);
      return;
    }
    if (scriptLoadingRef.current) return;
    scriptLoadingRef.current = true;

    console.log('[MSG91 Hook] Loading MSG91 SDK script from', MSG91_SCRIPT_URL);
    const existingScript = document.querySelector(`script[src="${MSG91_SCRIPT_URL}"]`);
    if (existingScript) {
      const handleLoad = () => {
        console.log('[MSG91 Hook] Existing MSG91 SDK script loaded.');
        setIsScriptLoaded(true);
      };
      existingScript.addEventListener('load', handleLoad);
      return () => existingScript.removeEventListener('load', handleLoad);
    }

    const script = document.createElement('script');
    script.src = MSG91_SCRIPT_URL;
    script.async = true;
    script.type = 'text/javascript';

    script.onload = () => {
      console.log('[MSG91 Hook] MSG91 SDK script loaded successfully.');
      setIsScriptLoaded(true);
    };

    script.onerror = (err) => {
      console.error('[MSG91 Hook] Failed to load MSG91 SDK script:', err);
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
        console.log('[MSG91 Hook] Initializing MSG91 Widget with widgetId & exposeMethods=true');
        const config = {
          widgetId,
          tokenAuth,
          exposeMethods: true,
          captchaRenderId,
          success: (data) => {
            console.log('[MSG91 Widget Global Success Callback]:', data);
            if (activeSuccessRef.current) {
              activeSuccessRef.current(data);
            }
          },
          failure: (error) => {
            console.warn('[MSG91 Widget Global Failure Callback]:', error);
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
    lastReqIdRef.current = null;
  }, []);

  /**
   * Helper to wait for window.sendOtp to become defined after initSendOTP
   */
  const waitForSendOtpMethod = async (timeoutMs = 1500) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (typeof window !== 'undefined' && window.sendOtp) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return Boolean(typeof window !== 'undefined' && window.sendOtp);
  };

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

      console.log(`[MSG91 Hook] Initiating sendOtp for phone: ${formatted12}`);

      return new Promise((resolve) => {
        if (typeof window === 'undefined') {
          setOtpState('error');
          setErrorMessage('Browser window is not available');
          return resolve({ success: false, error: 'Browser window not available' });
        }

        if (!isConfigured) {
          const err = 'MSG91 OTP service is not configured. Please check widget environment variables.';
          console.error('[MSG91 Send OTP]: Config missing');
          setOtpState('error');
          setErrorMessage(err);
          return resolve({ success: false, error: err });
        }

        let isSettled = false;
        let timeoutTimer = null;

        const cleanup = () => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
        };

        const handleSuccess = (response) => {
          if (isSettled) return;
          isSettled = true;
          cleanup();

          console.log('[MSG91 Send OTP Success Raw Response]:', response);

          const reqId =
            typeof response === 'object' && response
              ? response.reqId || response.requestId || response.message || response.jwt
              : null;
          
          if (reqId && typeof reqId === 'string' && reqId.length > 5) {
            lastReqIdRef.current = reqId;
            console.log('[MSG91 Hook] Saved lastReqIdRef:', reqId);
          }

          setOtpState('otpSent');
          setInfoMessage('OTP code sent successfully to your mobile number');
          resolve({ success: true, reqId: lastReqIdRef.current, raw: response });
        };

        const handleFailure = (error) => {
          if (isSettled) return;
          isSettled = true;
          cleanup();

          const rawMsg =
            (typeof error === 'object' && error && (error.message || error.description || error.err || error.error)) ||
            (typeof error === 'string' ? error : null);

          const userFriendlyMsg = rawMsg
            ? `Unable to send OTP: ${rawMsg}`
            : 'Unable to send OTP. Please check your mobile number and try again.';

          console.warn('[MSG91 Send OTP Failure Callback]:', error);
          setOtpState('error');
          setErrorMessage(userFriendlyMsg);
          resolve({ success: false, error: userFriendlyMsg });
        };

        // Guaranteed 15-second safety timeout so spinner never hangs indefinitely
        timeoutTimer = setTimeout(() => {
          if (isSettled) return;
          console.error('[MSG91 Send OTP Timeout]: No callback response received within 15s');
          handleFailure('OTP request timed out. Please check your network connection and try again.');
        }, OPERATION_TIMEOUT_MS);

        activeSuccessRef.current = handleSuccess;
        activeFailureRef.current = handleFailure;

        // Execute window.sendOtp invocation
        const executeSend = async () => {
          if (!window.sendOtp && window.initSendOTP) {
            console.log('[MSG91 Hook] window.sendOtp not defined yet, waiting for initSendOTP to expose methods...');
            try {
              window.initSendOTP({
                widgetId,
                tokenAuth,
                exposeMethods: true,
                captchaRenderId,
                success: (data) => {
                  if (activeSuccessRef.current) activeSuccessRef.current(data);
                },
                failure: (error) => {
                  if (activeFailureRef.current) activeFailureRef.current(error);
                },
              });
              isWidgetInitializedRef.current = true;
            } catch (e) {
              console.warn('[MSG91 initSendOTP re-init warning]:', e);
            }
            await waitForSendOtpMethod(1500);
          }

          if (window.sendOtp) {
            try {
              console.log(`[MSG91 Hook] Invoking window.sendOtp('${formatted12}')`);
              window.sendOtp(formatted12, handleSuccess, handleFailure);
              return;
            } catch (e) {
              console.error('[MSG91 window.sendOtp Exception]:', e);
              handleFailure(e);
              return;
            }
          }

          console.error('[MSG91 Hook] window.sendOtp is still undefined after script load.');
          handleFailure('MSG91 OTP script method unavailable. Please refresh the page and try again.');
        };

        executeSend().catch((err) => {
          console.error('[MSG91 Send OTP Execution Exception]:', err);
          handleFailure(err);
        });
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

      console.log('[MSG91 Hook] Initiating retryOtp...');

      return new Promise((resolve) => {
        if (typeof window === 'undefined' || !isConfigured) {
          setOtpState('error');
          setErrorMessage('OTP service not configured');
          return resolve({ success: false, error: 'Not configured' });
        }

        let isSettled = false;
        let timeoutTimer = setTimeout(() => {
          if (isSettled) return;
          console.error('[MSG91 Retry OTP Timeout]: 15s elapsed with no response');
          handleFailure('Resend OTP timed out. Please try again.');
        }, OPERATION_TIMEOUT_MS);

        const handleSuccess = (response) => {
          if (isSettled) return;
          isSettled = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);

          console.log('[MSG91 Retry OTP Success]:', response);
          setOtpState('otpSent');
          setInfoMessage('OTP code resent successfully!');
          resolve({ success: true, raw: response });
        };

        const handleFailure = (error) => {
          if (isSettled) return;
          isSettled = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);

          const rawMsg =
            (typeof error === 'object' && error && (error.message || error.description || error.err || error.error)) ||
            (typeof error === 'string' ? error : null);

          const userFriendlyMsg = rawMsg
            ? `Resend OTP failed: ${rawMsg}`
            : 'Unable to resend OTP. Please try again.';

          console.warn('[MSG91 Retry OTP Failure]:', error);
          setOtpState('error');
          setErrorMessage(userFriendlyMsg);
          resolve({ success: false, error: userFriendlyMsg });
        };

        activeSuccessRef.current = handleSuccess;
        activeFailureRef.current = handleFailure;

        if (window.retryOtp) {
          try {
            console.log(`[MSG91 Hook] Invoking window.retryOtp with lastReqId: ${lastReqIdRef.current}`);
            window.retryOtp(null, handleSuccess, handleFailure, lastReqIdRef.current);
            return;
          } catch (e) {
            console.warn('[MSG91 window.retryOtp exception, fallback to sendOtp]:', e);
          }
        }

        if (window.sendOtp) {
          try {
            console.log(`[MSG91 Hook] Fallback retry: window.sendOtp('${formatted12}')`);
            window.sendOtp(formatted12, handleSuccess, handleFailure);
            return;
          } catch (e) {
            handleFailure(e);
            return;
          }
        }

        handleFailure('MSG91 SDK retry method not available');
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

      console.log(`[MSG91 Hook] Initiating verifyOtp code: ${cleanOtp}, reqId: ${lastReqIdRef.current}`);

      return new Promise((resolve) => {
        if (typeof window === 'undefined' || !isConfigured) {
          setOtpState('error');
          setErrorMessage('Authentication service unavailable');
          return resolve({ success: false, error: 'Service unavailable' });
        }

        let isSettled = false;
        let timeoutTimer = setTimeout(() => {
          if (isSettled) return;
          console.error('[MSG91 Verify OTP Timeout]: 15s elapsed with no response from widget');
          handleFailure('Verification timed out. Please check the code and try again.');
        }, OPERATION_TIMEOUT_MS);

        const handleSuccess = async (response) => {
          if (isSettled) return;
          isSettled = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);

          console.log('[MSG91 Verify OTP Widget Callback Success]:', response);

          const accessToken =
            (typeof response === 'object' && response && (response['access-token'] || response.accessToken || response.token || response.jwt)) ||
            (typeof response === 'string' && response.length > 15 ? response : null);

          if (!accessToken) {
            console.error('[MSG91 Verify OTP Callback] No access token in response:', response);
            const err = 'OTP verification failed: Provider did not return a valid access token';
            setOtpState('error');
            setErrorMessage(err);
            return resolve({ success: false, error: err });
          }

          // Send MSG91 Access Token to Next.js Backend for Server Verification
          try {
            console.log('[MSG91 Hook] Sending access token to server /api/auth/msg91/verify');
            let backendRes = await fetch('/api/auth/msg91/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken }),
            });

            if (!backendRes.ok) {
              console.warn(`[MSG91 Hook] Primary route returned HTTP ${backendRes.status}, trying fallback route...`);
              backendRes = await fetch('/api/auth/phone/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken }),
              });
            }

            const backendData = await backendRes.json();

            if (!backendRes.ok || !backendData.success) {
              const serverErr = backendData.error || 'Server token verification failed';
              console.error('[MSG91 Server Verification Failed]:', serverErr, backendData);
              setOtpState('error');
              setErrorMessage(serverErr);
              return resolve({ success: false, error: serverErr });
            }

            console.log('[MSG91 Hook] Backend authentication successful for user:', backendData.user?.id);
            setOtpState('verified');
            setInfoMessage('Mobile number verified successfully!');
            return resolve({ success: true, user: backendData.user });
          } catch (serverException) {
            console.error('[MSG91 Backend Request Error]:', serverException);
            const err = 'Network error verifying token with server. Please try again.';
            setOtpState('error');
            setErrorMessage(err);
            return resolve({ success: false, error: err });
          }
        };

        const handleFailure = (error) => {
          if (isSettled) return;
          isSettled = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);

          const rawMsg =
            (typeof error === 'object' && error && (error.message || error.description || error.err || error.error)) ||
            (typeof error === 'string' ? error : null);

          const userFriendlyMsg = rawMsg
            ? `OTP Verification Failed: ${rawMsg}`
            : 'OTP verification failed. Please check the code and try again.';

          console.warn('[MSG91 Verify OTP Failure]:', error);
          setOtpState('error');
          setErrorMessage(userFriendlyMsg);
          resolve({ success: false, error: userFriendlyMsg });
        };

        activeSuccessRef.current = handleSuccess;
        activeFailureRef.current = handleFailure;

        if (window.verifyOtp) {
          try {
            console.log(`[MSG91 Hook] Invoking window.verifyOtp('${cleanOtp}', handleSuccess, handleFailure, '${lastReqIdRef.current}')`);
            window.verifyOtp(cleanOtp, handleSuccess, handleFailure, lastReqIdRef.current);
            return;
          } catch (e) {
            console.error('[MSG91 window.verifyOtp Exception]:', e);
            handleFailure(e);
            return;
          }
        }

        const noMethodErr = 'MSG91 OTP verification method is not ready yet. Please wait for SDK to load.';
        console.error('[MSG91 Hook]:', noMethodErr);
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
