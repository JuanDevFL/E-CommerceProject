const REDACTED_KEYS = new Set(['authorization', 'password', 'token', 'refreshToken']);

function normalizeBooleanEnv(value, fallback = true) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return fallback;
}

function sanitizeValue(value, key = '') {
  if (REDACTED_KEYS.has(String(key).toLowerCase())) {
    return '[REDACTED]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitizeValue(entryValue, entryKey)])
    );
  }

  return value;
}

function shouldLogAuthPayload(req) {
  return normalizeBooleanEnv(process.env.LOG_AUTH_PAYLOAD, false)
    && req.method === 'POST'
    && req.originalUrl === '/api/usuarios/login';
}

function buildRequestSnapshot(req) {
  const includeRawAuthPayload = shouldLogAuthPayload(req);
  const snapshot = {
    method: req.method,
    path: req.originalUrl,
  };

  if (req.query && Object.keys(req.query).length > 0) {
    snapshot.query = sanitizeValue(req.query);
  }

  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    snapshot.body = includeRawAuthPayload ? req.body : sanitizeValue(req.body);
  }

  const selectedHeaders = {
    origin: req.get('origin') || undefined,
    'content-type': req.get('content-type') || undefined,
    authorization: req.get('authorization') || undefined,
    'user-agent': req.get('user-agent') || undefined,
  };

  const compactHeaders = Object.fromEntries(
    Object.entries(selectedHeaders).filter(([, value]) => Boolean(value))
  );

  if (Object.keys(compactHeaders).length > 0) {
    snapshot.headers = sanitizeValue(compactHeaders);
  }

  return snapshot;
}

export function requestLogger(req, res, next) {
  const shouldLog = normalizeBooleanEnv(process.env.LOG_API_REQUESTS, true);

  if (!shouldLog || !req.originalUrl.startsWith('/api/')) {
    next();
    return;
  }

  const startedAt = Date.now();
  const snapshot = buildRequestSnapshot(req);

  console.log(`[API REQUEST] ${JSON.stringify(snapshot)}`);

  if (shouldLogAuthPayload(req) && req.body && typeof req.body === 'object') {
    console.log(`[AUTH PAYLOAD DEBUG] ${JSON.stringify({
      email: req.body.email,
      password: req.body.password,
    })}`);
  }

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      `[API RESPONSE] ${JSON.stringify({
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      })}`
    );
  });

  next();
}