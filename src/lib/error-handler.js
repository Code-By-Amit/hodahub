import { NextResponse } from 'next/server';

/**
 * Recursively extracts deep error details, cause chains, and Postgres/Node error properties.
 *
 * @param {any} error
 * @returns {Object} Structured error details
 */
export function extractErrorDetails(error) {
  if (!error) {
    return { message: 'Unknown error', name: 'Error' };
  }

  // Handle plain strings or primitives
  if (typeof error !== 'object') {
    return { message: String(error), name: 'Error' };
  }

  const details = {
    name: error.name || error.constructor?.name || 'Error',
    message: error.message || 'An unexpected error occurred',
  };

  if (error.code) details.code = String(error.code);
  if (error.errno) details.errno = error.errno;
  if (error.syscall) details.syscall = error.syscall;
  if (error.hostname) details.hostname = error.hostname;
  if (error.port) details.port = error.port;
  if (error.status) details.status = error.status;
  if (error.statusCode) details.statusCode = error.statusCode;

  // Postgres-specific error fields (pg / pg-pool)
  if (error.detail) details.detail = error.detail;
  if (error.hint) details.hint = error.hint;
  if (error.schema) details.schema = error.schema;
  if (error.table) details.table = error.table;
  if (error.column) details.column = error.column;
  if (error.constraint) details.constraint = error.constraint;

  // Next.js digest (for server-side render errors)
  if (error.digest) details.digest = error.digest;

  // Extract nested cause (common in Drizzle, fetch, Node 18+ errors)
  if (error.cause) {
    if (error.cause instanceof Error || typeof error.cause === 'object') {
      details.cause = {
        name: error.cause.name || 'Error',
        message: error.cause.message || String(error.cause),
        code: error.cause.code,
        syscall: error.cause.syscall,
        hostname: error.cause.hostname,
        errno: error.cause.errno,
      };
    } else {
      details.cause = String(error.cause);
    }
  }

  // Extract AggregateError items
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    details.nestedErrors = error.errors.map((e) =>
      e instanceof Error ? { message: e.message, code: e.code, name: e.name } : String(e)
    );
  }

  if (error.stack) {
    details.stack = error.stack;
  }

  return details;
}

/**
 * Builds a comprehensive human-readable summary of the error, including root cause and host.
 *
 * @param {any} error
 * @returns {string} Single-line or clean summary string
 */
export function getDescriptiveErrorMessage(error) {
  if (!error) return 'Internal server error';

  const details = extractErrorDetails(error);
  let summary = details.message || 'Internal server error';

  // If there's an underlying cause (e.g., DNS ENOTFOUND or socket error from Drizzle), append it
  if (details.cause?.message && !summary.includes(details.cause.message)) {
    summary += ` (Cause: ${details.cause.message})`;
  } else if (typeof details.cause === 'string' && !summary.includes(details.cause)) {
    summary += ` (Cause: ${details.cause})`;
  }

  // If there is Postgres detail, append it
  if (details.detail && !summary.includes(details.detail)) {
    summary += ` [Detail: ${details.detail}]`;
  }

  // If there's a specific network hint
  if (details.hostname && !summary.includes(details.hostname)) {
    summary += ` [Host: ${details.hostname}]`;
  }

  return summary;
}

/**
 * Logs an error with rich contextual information for Vercel and server runtimes.
 *
 * @param {string} context - Where the error happened (e.g. "[GET /api/categories]")
 * @param {any} error - The caught error
 * @param {Request} [request] - Next.js Request object (optional)
 */
export function logServerError(context, error, request = null) {
  const details = extractErrorDetails(error);
  const timestamp = new Date().toISOString();
  const method = request?.method || '';
  const url = request?.url || '';

  const logLines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🚨 [SERVER ERROR] ${context}`,
    `⏰ Time:      ${timestamp}`,
  ];

  if (method || url) {
    logLines.push(`📍 Request:   ${method} ${url}`);
  }

  logLines.push(`❌ Message:   ${details.message}`);

  if (details.cause) {
    const causeStr =
      typeof details.cause === 'object'
        ? `${details.cause.name}: ${details.cause.message}${details.cause.code ? ` (${details.cause.code})` : ''}${details.cause.hostname ? ` [${details.cause.hostname}]` : ''}`
        : details.cause;
    logLines.push(`🔍 Root Cause: ${causeStr}`);
  }

  if (details.code) logLines.push(`🏷️  Code:       ${details.code}`);
  if (details.syscall) logLines.push(`⚙️  Syscall:    ${details.syscall}`);
  if (details.hostname) logLines.push(`🌐 Hostname:   ${details.hostname}`);
  if (details.detail) logLines.push(`ℹ️  DB Detail:  ${details.detail}`);
  if (details.digest) logLines.push(`🔑 Digest:     ${details.digest}`);

  if (details.stack) {
    logLines.push(`📚 Stack Trace:`);
    logLines.push(details.stack);
  }

  logLines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  console.error(logLines.join('\n'));
}

/**
 * Centralized API error response handler.
 * Generates an informative JSON error response even in deployed environments
 * so developers can diagnose issues immediately.
 *
 * @param {any} error
 * @param {Request} [request]
 * @returns {NextResponse}
 */
export function handleApiError(error, request = null) {
  // 1. Auth errors
  if (error?.message === 'Unauthorized' || error?.status === 401) {
    return NextResponse.json({ error: 'Unauthorized', statusCode: 401 }, { status: 401 });
  }

  if (error?.message === 'Forbidden' || error?.status === 403) {
    return NextResponse.json({ error: 'Forbidden: insufficient permissions', statusCode: 403 }, { status: 403 });
  }

  // 2. Custom AppError / 4xx errors
  if (error?.status && error.status >= 400 && error.status < 500) {
    const payload = {
      error: error.message,
      statusCode: error.status,
    };
    if (error.errors) payload.errors = error.errors;
    return NextResponse.json(payload, { status: error.status });
  }

  // 3. Extract full diagnostic details
  const details = extractErrorDetails(error);
  const descriptiveMessage = getDescriptiveErrorMessage(error);
  const pathname = request?.nextUrl?.pathname || (request?.url ? new URL(request.url).pathname : undefined);
  const context = pathname ? `${request?.method || 'API'} ${pathname}` : 'API Route';

  // Log to server logs with full details
  logServerError(context, error, request);

  // Status code: 500 for unhandled/internal errors
  const statusCode = error?.status || error?.statusCode || 500;

  // If explicitly hidden by environment variable HIDE_ERROR_DETAILS=true, hide raw message
  const hideDetails = process.env.HIDE_ERROR_DETAILS === 'true';

  const responsePayload = {
    error: hideDetails ? 'Internal server error' : descriptiveMessage,
    statusCode,
    ...(pathname ? { path: pathname } : {}),
    ...(details.code ? { code: details.code } : {}),
  };

  // Provide extra diagnostics unless explicitly suppressed
  if (!hideDetails) {
    responsePayload.diagnostics = {
      name: details.name,
      message: details.message,
      ...(details.cause ? { cause: details.cause } : {}),
      ...(details.code ? { code: details.code } : {}),
      ...(details.hostname ? { hostname: details.hostname } : {}),
      ...(details.syscall ? { syscall: details.syscall } : {}),
      ...(details.detail ? { dbDetail: details.detail } : {}),
      ...(details.digest ? { digest: details.digest } : {}),
    };
  }

  return NextResponse.json(responsePayload, { status: statusCode });
}

