// Delhivery Express API client for FarmDirect.
//
// Thin, dependency-free transport layer: it knows how to talk to Delhivery and
// nothing about FarmDirect orders (that mapping lives in logisticsService.mjs).
//
// Endpoints implemented (verified against the official Delhivery Express
// Last-Mile API docs, https://delhivery-express-api-doc.readme.io):
//   GET  /c/api/pin-codes/json/            pincode serviceability
//   GET  /waybill/api/bulk/json/           bulk waybill (AWB) fetch
//   POST /api/cmu/create.json              package/order creation (manifestation)
//   GET  /api/v1/packages/json/            order tracking
//   POST /api/p/edit                       edit / cancel a manifested package
//   POST /api/backend/clientwarehouse/create/   client warehouse (pickup location)
//
// Auth for every call is the header `Authorization: Token <DELHIVERY_API_KEY>`.
// The key is read from the environment on every call, is never logged, and is
// never included in anything this module returns.

const PRODUCTION_BASE_URL = 'https://track.delhivery.com';
const STAGING_BASE_URL = 'https://staging-express.delhivery.com';
const DEFAULT_TIMEOUT_MS = 15000;

export class DelhiveryError extends Error {
  /**
   * @param {string} message  Safe, caller-facing message (never contains credentials).
   * @param {{ code: string, statusCode?: number, details?: unknown }} opts
   */
  constructor(message, { code, statusCode = 502, details } = {}) {
    super(message);
    this.name = 'DelhiveryError';
    this.code = code || 'delhivery_error';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** Reads Delhivery configuration from the environment. Never cached, so Vercel
 *  environment variables and the local .env loader behave identically. */
export const getConfig = () => {
  const apiKey = (process.env.DELHIVERY_API_KEY || '').trim();
  const envName = (process.env.DELHIVERY_ENV || '').trim().toLowerCase();
  const explicitBase = (process.env.DELHIVERY_BASE_URL || '').trim();
  const baseUrl = (
    explicitBase || (envName === 'staging' || envName === 'test' ? STAGING_BASE_URL : PRODUCTION_BASE_URL)
  ).replace(/\/+$/, '');
  return {
    apiKey,
    baseUrl,
    environment: envName === 'staging' || envName === 'test' ? 'staging' : 'production',
    clientName: (process.env.DELHIVERY_CLIENT_NAME || '').trim(),
    pickupName: (process.env.DELHIVERY_PICKUP_NAME || '').trim(),
    pickupPhone: (process.env.DELHIVERY_PICKUP_PHONE || '').trim(),
    pickupAddress: (process.env.DELHIVERY_PICKUP_ADDRESS || '').trim(),
    pickupCity: (process.env.DELHIVERY_PICKUP_CITY || '').trim(),
    pickupState: (process.env.DELHIVERY_PICKUP_STATE || '').trim(),
    pickupPin: (process.env.DELHIVERY_PICKUP_PIN || '').trim(),
    sellerGstTin: (process.env.DELHIVERY_SELLER_GST_TIN || '').trim(),
    hsnCode: (process.env.DELHIVERY_HSN_CODE || '').trim(),
    timeoutMs: Number(process.env.DELHIVERY_TIMEOUT_MS) > 0 ? Number(process.env.DELHIVERY_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS,
  };
};

export const isConfigured = () => getConfig().apiKey.length > 0;

/** Non-secret view of the integration state, safe to return from an API. */
export const getConfigStatus = () => {
  const cfg = getConfig();
  return {
    provider: 'delhivery',
    configured: Boolean(cfg.apiKey),
    environment: cfg.environment,
    baseUrl: cfg.baseUrl,
    pickupLocationConfigured: Boolean(cfg.pickupName),
    sellerGstTinConfigured: Boolean(cfg.sellerGstTin),
    hsnCodeConfigured: Boolean(cfg.hsnCode),
  };
};

const requireApiKey = () => {
  const cfg = getConfig();
  if (!cfg.apiKey) {
    throw new DelhiveryError(
      'Delhivery is not configured. Set the DELHIVERY_API_KEY environment variable to enable logistics.',
      { code: 'not_configured', statusCode: 503 },
    );
  }
  return cfg;
};

/** Strips the API key out of any string before it is logged or returned. */
const redact = (text, apiKey) => {
  if (typeof text !== 'string') return text;
  if (!apiKey) return text;
  return text.split(apiKey).join('***');
};

/** Delhivery rejects these characters unless the payload is JSON encoded. */
export const sanitizeText = (value, maxLength = 250) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[&#%;\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

/**
 * Single place where every Delhivery HTTP call goes through: auth header,
 * timeout, network/auth/parse error mapping, and credential redaction.
 */
const delhiveryRequest = async ({ path, method = 'GET', query = {}, body, rawBody, contentType = 'application/json' }) => {
  const cfg = requireApiKey();
  const url = new URL(path, `${cfg.baseUrl}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const headers = {
    Authorization: `Token ${cfg.apiKey}`,
    Accept: 'application/json',
  };
  let payload;
  if (rawBody !== undefined) {
    payload = rawBody;
    headers['Content-Type'] = contentType;
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  let response;
  try {
    response = await fetch(url.toString(), { method, headers, body: payload, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new DelhiveryError(`Delhivery did not respond within ${cfg.timeoutMs}ms.`, {
        code: 'timeout',
        statusCode: 504,
      });
    }
    throw new DelhiveryError('Could not reach the Delhivery API.', {
      code: 'network_error',
      statusCode: 502,
      details: redact(err?.message, cfg.apiKey),
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text().catch(() => '');
  const safeText = redact(text, cfg.apiKey);

  if (response.status === 401 || response.status === 403) {
    throw new DelhiveryError(
      'Delhivery rejected the API credentials. Check DELHIVERY_API_KEY and that it matches the selected environment.',
      { code: 'auth_failed', statusCode: 502, details: safeText.slice(0, 300) },
    );
  }

  let data = null;
  const trimmed = safeText.trim();
  if (trimmed) {
    try {
      data = JSON.parse(trimmed);
    } catch {
      // A few Delhivery endpoints (bulk waybill) legitimately answer with plain text.
      data = { raw: trimmed.slice(0, 2000) };
      if (response.status >= 400) {
        throw new DelhiveryError(`Delhivery returned an unreadable response (HTTP ${response.status}).`, {
          code: 'malformed_response',
          statusCode: 502,
          details: trimmed.slice(0, 300),
        });
      }
    }
  }

  if (response.status >= 400) {
    const remark = data?.rmk || data?.error || data?.Error || data?.message || `HTTP ${response.status}`;
    throw new DelhiveryError(`Delhivery API error: ${sanitizeText(remark, 300) || `HTTP ${response.status}`}`, {
      code: 'api_error',
      statusCode: 502,
      details: data ?? safeText.slice(0, 300),
    });
  }

  return { status: response.status, data };
};

// ---------------------------------------------------------------------------
// Pincode serviceability — GET /c/api/pin-codes/json/?filter_codes=<pin>
// ---------------------------------------------------------------------------
export const checkPincodeServiceability = async (pin) => {
  const code = String(pin || '').trim();
  if (!/^\d{6}$/.test(code)) {
    throw new DelhiveryError('pin must be a 6-digit Indian pincode.', { code: 'validation_failed', statusCode: 400 });
  }
  const { data } = await delhiveryRequest({ path: 'c/api/pin-codes/json/', query: { filter_codes: code } });
  const entry = Array.isArray(data?.delivery_codes) ? data.delivery_codes[0]?.postal_code : null;
  if (!entry) {
    return { pin: code, serviceable: false, prepaid: false, cod: false, pickup: false };
  }
  return {
    pin: code,
    serviceable: true,
    prepaid: entry.pre_paid === 'Y',
    cod: entry.cod === 'Y' || entry.cash === 'Y',
    pickup: entry.pickup === 'Y',
    district: entry.district ?? null,
    stateCode: entry.state_code ?? null,
    maxWeightKg: typeof entry.max_weight === 'number' ? entry.max_weight : null,
    maxAmount: typeof entry.max_amount === 'number' ? entry.max_amount : null,
  };
};

// ---------------------------------------------------------------------------
// Bulk waybill (AWB) fetch — GET /waybill/api/bulk/json/?cl=&count=
// ---------------------------------------------------------------------------
export const fetchWaybills = async (count = 1) => {
  const cfg = requireApiKey();
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1 || n > 10000) {
    throw new DelhiveryError('count must be an integer between 1 and 10000.', {
      code: 'validation_failed',
      statusCode: 400,
    });
  }
  const { data } = await delhiveryRequest({
    path: 'waybill/api/bulk/json/',
    // Documented as a query parameter for this endpoint; the Authorization
    // header is sent as well and the URL is never logged.
    query: { cl: cfg.clientName || undefined, count: n, token: cfg.apiKey },
  });
  const raw = typeof data === 'string' ? data : data?.raw ?? data;
  if (typeof raw === 'string') {
    return raw.replace(/["\s]/g, '').split(',').filter(Boolean);
  }
  if (Array.isArray(raw)) return raw.map((w) => String(w));
  throw new DelhiveryError('Delhivery returned an unexpected waybill payload.', {
    code: 'malformed_response',
    statusCode: 502,
  });
};

// ---------------------------------------------------------------------------
// Package creation / manifestation — POST /api/cmu/create.json
// Body must be the literal form `format=json&data=<json>` (per Delhivery docs).
// ---------------------------------------------------------------------------
export const createShipment = async ({ shipment, pickupLocation }) => {
  if (!shipment || typeof shipment !== 'object') {
    throw new DelhiveryError('shipment payload is required.', { code: 'validation_failed', statusCode: 400 });
  }
  if (!pickupLocation?.name) {
    throw new DelhiveryError(
      'pickup_location.name is required and must exactly match a warehouse registered with Delhivery.',
      { code: 'validation_failed', statusCode: 400 },
    );
  }

  const payload = { shipments: [shipment], pickup_location: pickupLocation };
  const { data } = await delhiveryRequest({
    path: 'api/cmu/create.json',
    method: 'POST',
    rawBody: `format=json&data=${JSON.stringify(payload)}`,
    contentType: 'application/json',
  });

  const packages = Array.isArray(data?.packages) ? data.packages : [];
  const pkg = packages[0] || null;
  const packageOk = pkg && String(pkg.status).toLowerCase() !== 'fail';

  // Delhivery answers HTTP 200 even for business failures — the body decides.
  if (data?.success !== true || data?.error === true || !packageOk) {
    const remark = pkg?.remarks || data?.rmk || 'Delhivery rejected the shipment.';
    throw new DelhiveryError(`Delhivery could not create the shipment: ${sanitizeText(remark, 300)}`, {
      code: 'api_error',
      statusCode: 502,
      details: { remarks: pkg?.remarks ?? null, rmk: data?.rmk ?? null, uploadWbn: data?.upload_wbn ?? null },
    });
  }
  if (!pkg.waybill) {
    throw new DelhiveryError('Delhivery accepted the shipment but returned no waybill.', {
      code: 'malformed_response',
      statusCode: 502,
      details: { uploadWbn: data?.upload_wbn ?? null },
    });
  }

  return {
    awb: String(pkg.waybill),
    refNum: pkg.refnum ? String(pkg.refnum) : null,
    sortCode: pkg.sort_code ?? null,
    paymentMode: pkg.payment ?? null,
    codAmount: typeof pkg.cod_amount === 'number' ? pkg.cod_amount : 0,
    uploadWbn: data?.upload_wbn ?? null,
    remarks: pkg.remarks ? sanitizeText(pkg.remarks, 300) : null,
  };
};

// ---------------------------------------------------------------------------
// Tracking — GET /api/v1/packages/json/?waybill=<awb>
// ---------------------------------------------------------------------------
export const trackShipment = async ({ waybill, refIds } = {}) => {
  if (!waybill && !refIds) {
    throw new DelhiveryError('waybill or refIds is required for tracking.', {
      code: 'validation_failed',
      statusCode: 400,
    });
  }
  const { data } = await delhiveryRequest({
    path: 'api/v1/packages/json/',
    query: { waybill: waybill || undefined, ref_ids: refIds || undefined },
  });
  if (data?.Error) {
    throw new DelhiveryError(`Delhivery tracking error: ${sanitizeText(data.Error, 300)}`, {
      code: 'api_error',
      statusCode: 502,
    });
  }
  const shipments = Array.isArray(data?.ShipmentData) ? data.ShipmentData : [];
  if (!shipments.length) {
    throw new DelhiveryError('No shipment found with that waybill.', { code: 'not_found', statusCode: 404 });
  }
  return shipments.map((entry) => entry?.Shipment).filter(Boolean);
};

// ---------------------------------------------------------------------------
// Cancellation — POST /api/p/edit with { waybill, cancellation: "true" }
// ---------------------------------------------------------------------------
export const cancelShipment = async (waybill) => {
  const awb = String(waybill || '').trim();
  if (!awb) {
    throw new DelhiveryError('waybill is required for cancellation.', { code: 'validation_failed', statusCode: 400 });
  }
  const { data } = await delhiveryRequest({
    path: 'api/p/edit',
    method: 'POST',
    body: { waybill: awb, cancellation: 'true' },
  });
  if (data?.status !== true) {
    const remark = data?.remark || data?.rmk || data?.error || 'Delhivery rejected the cancellation.';
    throw new DelhiveryError(`Delhivery could not cancel the shipment: ${sanitizeText(remark, 300)}`, {
      code: 'api_error',
      statusCode: 502,
    });
  }
  return {
    awb,
    cancelled: true,
    remark: data?.remark ? sanitizeText(data.remark, 300) : null,
    orderId: data?.order_id ?? null,
  };
};

// ---------------------------------------------------------------------------
// Client warehouse (pickup location) — POST /api/backend/clientwarehouse/create/
// ---------------------------------------------------------------------------
export const createWarehouse = async (warehouse) => {
  const required = ['name', 'phone', 'address', 'city', 'pin', 'registered_name'];
  const missing = required.filter((field) => !warehouse?.[field]);
  if (missing.length) {
    throw new DelhiveryError(`Warehouse payload is missing: ${missing.join(', ')}.`, {
      code: 'validation_failed',
      statusCode: 400,
    });
  }
  const { data } = await delhiveryRequest({
    path: 'api/backend/clientwarehouse/create/',
    method: 'POST',
    body: {
      name: sanitizeText(warehouse.name, 100),
      registered_name: sanitizeText(warehouse.registered_name, 100),
      email: warehouse.email ? sanitizeText(warehouse.email, 100) : '',
      phone: String(warehouse.phone),
      address: sanitizeText(warehouse.address, 250),
      city: sanitizeText(warehouse.city, 100),
      country: warehouse.country || 'India',
      pin: String(warehouse.pin),
      return_address: sanitizeText(warehouse.return_address || warehouse.address, 250),
      return_pin: String(warehouse.return_pin || warehouse.pin),
      return_city: sanitizeText(warehouse.return_city || warehouse.city, 100),
      return_state: sanitizeText(warehouse.return_state || warehouse.state || '', 100),
      return_country: warehouse.return_country || 'India',
    },
  });
  if (data?.success !== true) {
    const remark = data?.error || data?.rmk || 'Delhivery rejected the warehouse.';
    throw new DelhiveryError(`Delhivery could not register the warehouse: ${sanitizeText(remark, 300)}`, {
      code: 'api_error',
      statusCode: 502,
    });
  }
  return { name: data?.data?.name ?? warehouse.name, pin: data?.data?.pincode ?? warehouse.pin, active: data?.data?.active ?? true };
};

export const __testing = { PRODUCTION_BASE_URL, STAGING_BASE_URL, redact };
