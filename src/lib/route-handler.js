import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { formatZodErrorResponse } from '@/lib/zod-utils';

/**
 * Standard API response helper for consistent JSON payloads
 */
export const ApiResponse = {
  success(data = {}, status = 200, init = {}) {
    return NextResponse.json(data, { status, ...init });
  },
  created(data = {}, init = {}) {
    return NextResponse.json(data, { status: 201, ...init });
  },
  error(message = 'Bad Request', status = 400, errors = undefined) {
    const payload = { error: message };
    if (errors) payload.errors = errors;
    return NextResponse.json(payload, { status });
  },
  notFound(message = 'Resource not found') {
    return NextResponse.json({ error: message }, { status: 404 });
  },
  unauthorized(message = 'Unauthorized') {
    return NextResponse.json({ error: message }, { status: 401 });
  },
  forbidden(message = 'Forbidden') {
    return NextResponse.json({ error: message }, { status: 403 });
  },
};

/**
 * Centralized higher-order route wrapper for Next.js App Router API endpoints.
 *
 * Handles:
 * - Authentication (user / admin)
 * - Role-based authorization
 * - Request body, query string, and route params Zod validation
 * - Dynamic route parameters (handling Promise-based params in Next.js 15+)
 * - Redis-backed rate limiting
 * - Safe exception handling & uniform error response formatting
 *
 * @param {Object} options
 * @param {boolean} [options.auth=false] - Requires authenticated session
 * @param {boolean} [options.adminOnly=false] - Requires admin role
 * @param {string[]} [options.roles] - Allowed user roles (e.g. ['admin'])
 * @param {import('zod').ZodType} [options.schema] - Zod schema to validate request body
 * @param {import('zod').ZodType} [options.querySchema] - Zod schema to validate URL query parameters
 * @param {import('zod').ZodType} [options.paramsSchema] - Zod schema to validate route parameters
 * @param {Object} [options.rateLimit] - Rate limit config { points, duration, keyPrefix, keyGenerator }
 * @param {Function} options.handler - Handler receiving ({ request, user, data, query, params })
 * @returns {Function} Next.js route handler function
 */
export function routeHandler({
  auth = false,
  adminOnly = false,
  roles = null,
  schema = null,
  querySchema = null,
  paramsSchema = null,
  rateLimit = null,
  handler,
}) {
  if (typeof handler !== 'function') {
    throw new Error('routeHandler requires a handler function');
  }

  return async function (request, context = {}) {
    try {
      let user = null;

      // 1. Enforce Authentication & Role-based Authorization
      if (adminOnly || (roles && roles.includes('admin') && roles.length === 1)) {
        user = await requireAdmin(request);
      } else if (auth || roles) {
        user = await requireAuth(request);
        if (roles && Array.isArray(roles) && !roles.includes(user.role)) {
          return ApiResponse.forbidden('Forbidden: insufficient permissions');
        }
      }

      // 2. Enforce Rate Limiting if specified
      if (rateLimit) {
        const ip = getClientIP(request);
        const identifier = rateLimit.keyGenerator
          ? rateLimit.keyGenerator(request, user)
          : `${rateLimit.keyPrefix || 'rl'}:${user?.id || ip}`;

        const limitResult = await checkRateLimit(
          identifier,
          rateLimit.points || 20,
          rateLimit.duration || 60
        );

        if (!limitResult.success) {
          const res = ApiResponse.error('Too many requests. Please try again later.', 429);
          if (limitResult.resetAt) {
            res.headers.set('Retry-After', Math.ceil((limitResult.resetAt.getTime() - Date.now()) / 1000).toString());
          }
          return res;
        }
      }

      // 3. Resolve Dynamic Route Parameters (handles async params in Next.js 15+)
      let resolvedParams = {};
      if (context?.params) {
        resolvedParams = typeof context.params.then === 'function' ? await context.params : context.params;
      }

      if (paramsSchema) {
        const paramsResult = paramsSchema.safeParse(resolvedParams);
        if (!paramsResult.success) {
          return NextResponse.json(
            formatZodErrorResponse(paramsResult, 'Invalid route parameter'),
            { status: 400 }
          );
        }
        resolvedParams = paramsResult.data;
      }

      // 4. Resolve and Validate URL Query Parameters
      let query = {};
      if (request?.url) {
        const { searchParams } = new URL(request.url);
        query = Object.fromEntries(searchParams.entries());

        if (querySchema) {
          const queryResult = querySchema.safeParse(query);
          if (!queryResult.success) {
            return NextResponse.json(
              formatZodErrorResponse(queryResult, 'Invalid query parameter'),
              { status: 400 }
            );
          }
          query = queryResult.data;
        }
      }

      // 5. Parse and Validate Request Body (for POST / PUT / PATCH)
      let validatedData = null;
      if (schema) {
        let body;
        try {
          const text = await request.text();
          body = text ? JSON.parse(text) : {};
        } catch {
          return ApiResponse.error('Malformed JSON body', 400);
        }

        const parseResult = schema.safeParse(body);
        if (!parseResult.success) {
          return NextResponse.json(
            formatZodErrorResponse(parseResult, 'Validation failed'),
            { status: 400 }
          );
        }
        validatedData = parseResult.data;
      }

      // 6. Execute Handler
      const result = await handler({
        request,
        user,
        data: validatedData,
        query,
        params: resolvedParams,
      });

      // If handler returned a standard NextResponse or Response, return directly
      if (result instanceof Response) {
        return result;
      }

      // If plain object was returned, wrap with NextResponse.json
      return ApiResponse.success(result);
    } catch (error) {
      if (error?.message === 'Unauthorized') {
        return ApiResponse.unauthorized('Unauthorized');
      }
      if (error?.message === 'Forbidden') {
        return ApiResponse.forbidden('Forbidden');
      }
      if (error?.status && error?.message) {
        return ApiResponse.error(error.message, error.status, error.errors);
      }

      console.error('[Route Handler Error]:', error);
      return ApiResponse.error(
        process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        500
      );
    }
  };
}
