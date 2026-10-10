import { isTokenUsed, markTokenUsed } from './tokenReplayGuard.js';
import { formatIndianMobile, extract10DigitMobile } from './msg91.js';

/**
 * Verify MSG91 Widget access token server-side via MSG91 official endpoint.
 *
 * SECURITY ARCHITECTURE:
 * 1. Checks and enforces single-use token protection (anti-replay).
 * 2. Authenticates with MSG91 using server-only account authkey.
 * 3. Extracts verified identity strictly from trusted MSG91 response
 *    (MSG91 returns verified mobile number in the `message` field when type === 'success').
 * 4. Compares verified number with claimed phone (if provided) and rejects on mismatch.
 * 5. Fails closed on any parse failure, timeout, mismatch, or error.
 *
 * @param {string} accessToken - JWT access token returned by MSG91 verifyOtp callback
 * @param {string} [claimedPhone] - Optional client-claimed phone to strictly bind and verify against
 * @returns {Promise<{ success: boolean, mobile?: string, formattedMobile?: string, error?: string, raw?: unknown }>}
 */
export async function verifyMSG91AccessToken(accessToken, claimedPhone = null) {
  if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
    return {
      success: false,
      error: 'Access token is required for verification',
    };
  }

  const cleanToken = accessToken.trim();

  // 1. Single-use token replay guard
  if (await isTokenUsed(cleanToken)) {
    console.warn('[MSG91 Server Verification] Token replay detected! Token already consumed.');
    return {
      success: false,
      error: 'OTP access token has already been used. Please request a new OTP.',
    };
  }

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
        authkey: authKey,
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

    // Diagnostic logging: log full response body (authkey is redacted)
    console.log('[MSG91 Server Verification] MSG91 HTTP status:', response.status, 'Response:', JSON.stringify(data));

    // Reject on HTTP error or MSG91 error payload
    if (!response.ok || data.type === 'error' || data.hasError || data.status === 'fail') {
      const statusMsg = data?.message || data?.error || `MSG91 verification failed (HTTP ${response.status})`;
      console.warn('[MSG91 Server Verification Failure]:', statusMsg);
      return {
        success: false,
        error: typeof statusMsg === 'string' ? statusMsg : 'MSG91 verification failed',
        raw: data,
      };
    }

    // MSG91 success criteria check
    const isSuccess = data.type === 'success' || data.status === 'success';
    if (!isSuccess) {
      console.warn('[MSG91 Server Verification] Invalid or rejected access token:', data);
      return {
        success: false,
        error: data.message || data.error || 'Invalid or expired OTP access token',
        raw: data,
      };
    }

    // Extract verified mobile or identifier strictly from trusted MSG91 response.
    // In MSG91 widget/verifyAccessToken, when type === 'success', the verified mobile
    // is returned in the `message` field (e.g. { "type": "success", "message": "919999999999" }).
    let rawIdentifier = '';
    if (typeof data.mobile === 'string' && data.mobile.trim()) {
      rawIdentifier = data.mobile.trim();
    } else if (typeof data.identifier === 'string' && data.identifier.trim()) {
      rawIdentifier = data.identifier.trim();
    } else if (typeof data.phone === 'string' && data.phone.trim()) {
      rawIdentifier = data.phone.trim();
    } else if (data.type === 'success' && typeof data.message === 'string' && data.message.trim()) {
      rawIdentifier = data.message.trim();
    }

    const verified10Digit = extract10DigitMobile(rawIdentifier);
    if (!verified10Digit || verified10Digit.length !== 10 || !/^[6-9]\d{9}$/.test(verified10Digit)) {
      console.error('[MSG91 Server Verification] Response confirmed success but contained no valid mobile identifier:', data);
      return {
        success: false,
        error: 'Unable to extract verified mobile identity from OTP provider response',
        raw: data,
      };
    }

    const formattedVerified12 = formatIndianMobile(verified10Digit);

    // If client claimed a phone number, strictly compare with verified phone
    if (claimedPhone) {
      const claimed10 = extract10DigitMobile(claimedPhone);
      const formattedClaimed12 = formatIndianMobile(claimed10);
      if (formattedClaimed12 !== formattedVerified12) {
        console.warn(`[MSG91 Server Verification] Phone mismatch! Claimed: ${formattedClaimed12}, Verified by MSG91: ${formattedVerified12}`);
        return {
          success: false,
          error: 'Phone number mismatch. The verified OTP does not belong to the requested mobile number.',
          raw: data,
        };
      }
    }

    // Mark token as consumed to prevent replay attacks
    await markTokenUsed(cleanToken);

    console.log(`[MSG91 Server Verification Success] Verified mobile ending in ...${verified10Digit.slice(-4)}`);

    return {
      success: true,
      mobile: verified10Digit, // clean 10-digit string e.g. "9876543210"
      formattedMobile: formattedVerified12, // 12-digit string e.g. "919876543210"
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
