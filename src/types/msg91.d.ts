/**
 * MSG91 OTP Widget Web SDK TypeScript Declarations
 */

export interface Msg91WidgetConfig {
  widgetId: string;
  tokenAuth: string;
  identifier?: string;
  exposeMethods?: boolean;
  captchaRenderId?: string;
  success?: (data: Msg91SuccessResponse | string) => void;
  failure?: (error: Msg91FailureResponse | string) => void;
}

export interface Msg91SuccessResponse {
  'access-token'?: string;
  accessToken?: string;
  token?: string;
  message?: string;
  type?: string;
  status?: string;
  reqId?: string;
  mobile?: string;
  identifier?: string;
  [key: string]: unknown;
}

export interface Msg91FailureResponse {
  message?: string;
  description?: string;
  error?: string;
  err?: string;
  code?: string | number;
  [key: string]: unknown;
}

declare global {
  interface Window {
    initSendOTP?: (config: Msg91WidgetConfig) => void;
    sendOtp?: (
      identifier: string,
      successCallback: (data: Msg91SuccessResponse) => void,
      failureCallback: (error: Msg91FailureResponse) => void
    ) => void;
    retryOtp?: (
      channel: string | null | number,
      successCallback: (data: Msg91SuccessResponse) => void,
      failureCallback: (error: Msg91FailureResponse) => void,
      reqId?: string | null
    ) => void;
    verifyOtp?: (
      otp: string,
      successCallback: (data: Msg91SuccessResponse) => void,
      failureCallback: (error: Msg91FailureResponse) => void,
      reqId?: string | null
    ) => void;
  }
}

export {};
