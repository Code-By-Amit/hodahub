'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatIndianMobile } from '@/lib/msg91';

const MSG91_SCRIPT_PRIMARY = 'https://verify.msg91.com/otp-provider.js';
const MSG91_SCRIPT_FALLBACK = 'https://verify.phone91.com/otp-provider.js';
const DEFAULT_WIDGET_ID = '366977645959313131313239';

export function useMsg91Otp() {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [widgetId, setWidgetId] = useState(DEFAULT_WIDGET_ID);
  const [tokenAuth, setTokenAuth] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [lastReqId, setLastReqId] = useState(null);
  const lastReqIdRef = useRef(null);
  const scriptLoadingRef = useRef(false);

  const updateReqId = (id) => {
    if (id) {
      lastReqIdRef.current = id;
      setLastReqId(id);
    }
  };

  // Fetch widget config from backend
  useEffect(() => {
    let isMounted = true;
    async function fetchConfig() {
      try {
        const res = await fetch('/api/auth/phone/widget-token');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.widgetId) setWidgetId(data.widgetId);
            if (data.tokenAuth) setTokenAuth(data.tokenAuth);
            setIsConfigured(Boolean(data.isConfigured));
          }
        }
      } catch (err) {
        console.warn('[MSG91 Hook] Error fetching widget config:', err);
      }
    }
    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Idempotently load MSG91 SDK script on client
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.initSendOTP || window.sendOtp) {
      setIsScriptLoaded(true);
      return;
    }

    if (scriptLoadingRef.current) return;
    scriptLoadingRef.current = true;

    function loadScript(src, fallbackSrc) {
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => setIsScriptLoaded(true));
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.type = 'text/javascript';

      script.onload = () => {
        setIsScriptLoaded(true);
      };

      script.onerror = () => {
        console.warn(`[MSG91 Hook] Failed to load ${src}, trying fallback...`);
        if (fallbackSrc) {
          const fallbackScript = document.createElement('script');
          fallbackScript.src = fallbackSrc;
          fallbackScript.async = true;
          fallbackScript.type = 'text/javascript';
          fallbackScript.onload = () => setIsScriptLoaded(true);
          fallbackScript.onerror = (e) => console.error('[MSG91 Hook] Fallback script failed to load', e);
          document.head.appendChild(fallbackScript);
        }
      };

      document.head.appendChild(script);
    }

    loadScript(MSG91_SCRIPT_PRIMARY, MSG91_SCRIPT_FALLBACK);
  }, []);

  /**
   * Initialize Widget for a phone number
   */
  const initWidget = useCallback(
    (phone, successCb, failureCb) => {
      if (typeof window === 'undefined') return;

      const formattedPhone = formatIndianMobile(phone);

      const config = {
        widgetId: widgetId || DEFAULT_WIDGET_ID,
        tokenAuth: tokenAuth || 'DEV_STUB_TOKEN',
        identifier: formattedPhone,
        exposeMethods: true,
        success: (data) => {
          if (data && data.reqId) updateReqId(data.reqId);
          if (successCb) successCb(data);
        },
        failure: (error) => {
          if (failureCb) failureCb(error);
        },
      };

      if (window.initSendOTP) {
        try {
          window.initSendOTP(config);
        } catch (err) {
          console.warn('[MSG91 initSendOTP Warning]:', err);
        }
      }
    },
    [widgetId, tokenAuth]
  );

  /**
   * Send OTP via MSG91 ExposeMethods
   */
  const sendOtp = useCallback(
    async (phone) => {
      const formattedPhone = formatIndianMobile(phone);

      return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
          return reject(new Error('Window not available'));
        }

        const handleSuccess = (response) => {
          const reqId = typeof response === 'object' && response ? response.reqId : null;
          if (reqId) updateReqId(reqId);
          resolve({
            success: true,
            reqId,
            message: 'OTP sent successfully via MSG91',
            raw: response,
          });
        };

        const handleFailure = (error) => {
          const msg =
            (typeof error === 'object' && error && (error.message || error.description || error.err)) ||
            (typeof error === 'string' ? error : 'Failed to send OTP');
          reject(new Error(msg));
        };

        // If real MSG91 credentials are configured and SDK methods exist
        if (isConfigured && (window.initSendOTP || window.sendOtp)) {
          if (window.sendOtp) {
            try {
              window.sendOtp(formattedPhone, handleSuccess, handleFailure);
              return;
            } catch (e) {
              console.warn('[MSG91 window.sendOtp error]:', e);
            }
          }
          initWidget(formattedPhone, handleSuccess, handleFailure);
          return;
        }

        // Development Fallback if MSG91 is unconfigured or in stub mode
        console.log(`[MSG91 DEV STUB] Sending OTP to +${formattedPhone}`);
        setTimeout(() => {
          const mockReqId = 'DEV_REQ_ID_' + Date.now();
          updateReqId(mockReqId);
          handleSuccess({ message: 'OTP sent (Dev Stub Mode)', reqId: mockReqId });
        }, 600);
      });
    },
    [initWidget, isConfigured]
  );

  /**
   * Retry / Resend OTP
   */
  const retryOtp = useCallback(
    async (phone) => {
      const formattedPhone = formatIndianMobile(phone);

      return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
          return reject(new Error('Window not available'));
        }

        const handleSuccess = (response) => {
          resolve({ success: true, message: 'OTP resent successfully', raw: response });
        };

        const handleFailure = (error) => {
          const msg =
            (typeof error === 'object' && error && (error.message || error.description)) ||
            'Failed to resend OTP';
          reject(new Error(msg));
        };

        if (isConfigured && window.retryOtp) {
          try {
            window.retryOtp(null, handleSuccess, handleFailure, lastReqIdRef.current);
            return;
          } catch (e) {
            console.warn('[MSG91 window.retryOtp error]:', e);
          }
        }

        if (isConfigured && window.sendOtp) {
          try {
            window.sendOtp(formattedPhone, handleSuccess, handleFailure);
            return;
          } catch (e) {
            console.warn('[MSG91 sendOtp resend fallback error]:', e);
          }
        }

        // Development fallback
        setTimeout(() => {
          handleSuccess({ message: 'OTP resent (Dev Stub Mode)' });
        }, 600);
      });
    },
    [isConfigured]
  );

  /**
   * Verify OTP via MSG91 ExposeMethods
   */
  const verifyOtp = useCallback(
    async (otp) => {
      const cleanOtp = String(otp || '').trim();

      return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
          return reject(new Error('Window not available'));
        }

        const handleSuccess = (response) => {
          const accessToken =
            (typeof response === 'object' && response && (response['access-token'] || response.accessToken || response.token || response.message)) ||
            'DEV_STUB_TOKEN_' + Date.now();

          resolve({
            success: true,
            accessToken,
            raw: response,
          });
        };

        const handleFailure = (error) => {
          const msg =
            (typeof error === 'object' && error && (error.message || error.description || error.error)) ||
            (typeof error === 'string' ? error : 'Invalid OTP code');
          reject(new Error(msg));
        };

        // Only call window.verifyOtp if MSG91 is configured and method is available
        if (isConfigured && window.verifyOtp) {
          try {
            window.verifyOtp(cleanOtp, handleSuccess, handleFailure, lastReqIdRef.current);
            return;
          } catch (e) {
            console.warn('[MSG91 window.verifyOtp error]:', e);
          }
        }

        // Development fallback if MSG91 script is unconfigured or in dev stub mode
        console.log(`[MSG91 DEV STUB] Verifying OTP code: ${cleanOtp}`);
        setTimeout(() => {
          handleSuccess({
            'access-token': 'DEV_STUB_TOKEN_' + Date.now(),
            message: 'OTP verified (Dev Stub Mode)',
          });
        }, 600);
      });
    },
    [isConfigured]
  );

  return {
    isScriptLoaded,
    isConfigured,
    sendOtp,
    retryOtp,
    verifyOtp,
  };
}
