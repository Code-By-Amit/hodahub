export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.error = data.error || message;
    this.errors = data.errors || null;
    if (typeof data === 'object' && data !== null) {
      Object.assign(this, data);
    }
  }
}

export function toQueryString(params) {
  if (!params) return '';
  if (typeof params === 'string') return params.startsWith('?') ? params.slice(1) : params;
  if (params instanceof URLSearchParams) return params.toString();
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  }
  return sp.toString();
}

async function request(url, { method = 'GET', data, headers = {}, ...customOpts } = {}) {
  const reqHeaders = { ...headers };
  let body = data;

  if (data !== undefined && data !== null) {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      delete reqHeaders['Content-Type'];
    } else if (typeof data === 'object') {
      reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
      body = JSON.stringify(data);
    }
  }

  const response = await fetch(url, {
    method,
    headers: reqHeaders,
    body,
    ...customOpts,
  });

  if (customOpts.raw) {
    return response;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let resultData;
  if (response.status === 204) {
    resultData = null;
  } else if (isJson) {
    resultData = await response.json().catch(() => ({}));
  } else {
    resultData = await response.text().catch(() => '');
  }

  if (!response.ok) {
    const errorMsg =
      (resultData && typeof resultData === 'object' && (resultData.error || resultData.message)) ||
      (typeof resultData === 'string' && resultData) ||
      `Request failed with status ${response.status}`;

    throw new ApiError(errorMsg, response.status, typeof resultData === 'object' ? resultData : {});
  }

  return resultData;
}

export const api = {
  get: (url, opts) => request(url, { method: 'GET', ...opts }),
  post: (url, data, opts) => request(url, { method: 'POST', data, ...opts }),
  put: (url, data, opts) => request(url, { method: 'PUT', data, ...opts }),
  patch: (url, data, opts) => request(url, { method: 'PATCH', data, ...opts }),
  del: (url, opts) => request(url, { method: 'DELETE', ...opts }),
  request,
};

export default api;
