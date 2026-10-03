/**
 * MSG91 OTP Widget Integration Helper (Production Ready)
 * Integration Type: Web SDK → Custom UI → ExposeMethods
 * Official API: https://control.msg91.com/api/v5/widget/verifyAccessToken
 */

/**
 * Format Indian mobile number to 12-digit string starting with 91 (e.g. 919876543210)
 * @param {string|number} phone
 * @returns {string} 12-digit mobile number with 91 prefix
 */
export function formatIndianMobile(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length > 10) {
    return `91${digits.slice(-10)}`;
  }
  return digits;
}

/**
 * Extract clean 10-digit Indian mobile number
 * @param {string|number} phone
 * @returns {string} 10-digit mobile number string (e.g. "9876543210")
 */
export function extract10DigitMobile(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.slice(-10);
}

/**
 * Get MSG91 Widget client-safe configuration.
 * Exposes ONLY Widget ID and Widget Token Auth (Client-safe tokens).
 * NEVER returns MSG91_AUTH_KEY.
 * @returns {{ widgetId: string, tokenAuth: string, isConfigured: boolean }}
 */
export function getMSG91WidgetConfig() {
  const widgetId = (process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || '').trim();
  const tokenAuth = (process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || '').trim();

  const isConfigured = Boolean(
    widgetId &&
    tokenAuth &&
    tokenAuth !== 'your_msg91_widget_token_auth_here' &&
    tokenAuth !== 'your_msg91_auth_key_here'
  );

  return {
    widgetId,
    tokenAuth,
    isConfigured,
  };
}

/**
 * Verify MSG91 Widget access token server-side via MSG91 official endpoint.
 *
 * CRITICAL SECURITY REQUIREMENT:
 * This function accepts ONLY the MSG91 access token obtained from the widget.
 * It DOES NOT accept a client-asserted phone number or return mock success stubs.
 * The verified identity is extracted EXCLUSIVELY from MSG91's trusted HTTP response.
 *
 * @param {string} accessToken - JWT access token returned by MSG91 verifyOtp callback
 * @returns {Promise<{ success: boolean, mobile?: string, error?: string, raw?: unknown }>}
 */
export async function verifyMSG91AccessToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
    return {
      success: false,
      error: 'Access token is required for verification',
    };
  }

  const cleanToken = accessToken.trim();
  const authKey = (process.env.MSG91_AUTH_KEY || '').trim();

  if (!authKey || authKey === 'your_msg91_auth_key_here') {
    console.error('[MSG91 Server Verification] MSG91_AUTH_KEY is not configured on server');
    return {
      success: false,
      error: 'Server authentication configuration missing',
    };
  }

  try {
    const verifyUrl = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        authkey: authKey,
        'access-token': cleanToken,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const responseText = await response.text();
    let data = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawText: responseText };
    }

    if (!response.ok) {
      const statusMsg = data?.message || data?.error || `MSG91 API error (HTTP ${response.status})`;
      console.warn(`[MSG91 Server Verification Failure] HTTP ${response.status}:`, statusMsg);
      return {
        success: false,
        error: typeof statusMsg === 'string' ? statusMsg : 'MSG91 verification failed',
        raw: data,
      };
    }

    // MSG91 success criteria check
    const isSuccess =
      data.type === 'success' ||
      data.status === 'success' ||
      data.message === 'Token verified successfully' ||
      Boolean(data.mobile) ||
      Boolean(data.identifier);

    if (!isSuccess) {
      console.warn('[MSG91 Server Verification] Invalid or rejected access token:', data);
      return {
        success: false,
        error: data.message || data.error || 'Invalid or expired OTP access token',
        raw: data,
      };
    }

    // Extract verified mobile or identifier strictly from trusted MSG91 response
    const rawIdentifier = String(data.mobile || data.identifier || '').trim();
    if (!rawIdentifier) {
      console.error('[MSG91 Server Verification] Response confirmed success but contained no identity field:', data);
      return {
        success: false,
        error: 'Unable to extract verified identity from MSG91 response',
        raw: data,
      };
    }

    const verified10Digit = extract10DigitMobile(rawIdentifier);
    if (!verified10Digit || verified10Digit.length !== 10) {
      console.error('[MSG91 Server Verification] Extracted mobile number format invalid:', rawIdentifier);
      return {
        success: false,
        error: 'Invalid mobile number format received from provider',
        raw: data,
      };
    }

    console.log(`[MSG91 Server Verification Success] Verified mobile ending in ...${verified10Digit.slice(-4)}`);

    return {
      success: true,
      mobile: verified10Digit, // clean 10-digit string e.g. "9876543210"
      formattedMobile: formatIndianMobile(verified10Digit), // 12-digit string e.g. "919876543210"
      raw: data,
    };
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[MSG91 Server Verification Exception]:', errMessage);
    return {
      success: false,
      error: 'Failed to connect to authentication verification provider',
    };
  }
}
