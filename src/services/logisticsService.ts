/**
 * Logistics (Delhivery) client.
 *
 * Thin typed wrapper over the `/api/logistics/*` routes in server/aiIntentApi.mjs.
 * Relative URLs on purpose: the Vite dev server mounts the API as middleware
 * (see apiServerPlugin in vite.config.ts), so these work on :3000 with no proxy
 * and no base-URL env var, exactly like assistantService.ts.
 *
 * Error handling deliberately differs from the voice/marketplace services. Those
 * swallow failures and fall back to local mock data, which is right for a search
 * box. Booking freight is not: a silently-dropped shipment looks identical to a
 * successful one in the UI and the produce never gets collected. So every call
 * here throws a LogisticsError carrying the server's machine-readable `code`, and
 * callers are expected to handle it.
 *
 * Nothing here needs DELHIVERY_API_KEY to be exercised in tests - the e2e suite
 * (test-logistics-e2e.mjs) drives these same routes against a mock provider.
 */

import type {
  LogisticsConfigStatus,
  LogisticsShipment,
  PincodeServiceability,
  ShipmentCancellation,
  ShipmentRequest,
  ShipmentTracking,
  ShipmentValidation,
} from '../types';

const BASE = '/api/logistics';

/**
 * Codes the API can return. `not_configured` means no credentials are set -
 * treat it as "logistics is off", not as a user-facing failure.
 */
export type LogisticsErrorCode =
  | 'not_configured'
  | 'validation_failed'
  | 'order_not_found'
  | 'shipment_exists'
  | 'auth_failed'
  | 'api_error'
  | 'network_error'
  | 'timeout'
  | 'malformed_response'
  | 'invalid_json'
  | 'not_found'
  | 'internal_error'
  | 'unknown';

export class LogisticsError extends Error {
  readonly code: LogisticsErrorCode;
  readonly status: number;
  /** Field-level messages, present for `validation_failed`. Safe to display. */
  readonly details?: string[];
  /** The existing shipment, present for `shipment_exists`. */
  readonly shipment?: LogisticsShipment;

  constructor(
    message: string,
    opts: { code?: string; status?: number; details?: unknown; shipment?: LogisticsShipment } = {}
  ) {
    super(message);
    this.name = 'LogisticsError';
    this.code = (opts.code as LogisticsErrorCode) || 'unknown';
    this.status = opts.status ?? 0;
    this.details = Array.isArray(opts.details) ? (opts.details as string[]) : undefined;
    this.shipment = opts.shipment;
  }

  /** True when the integration simply has no credentials configured yet. */
  get isNotConfigured(): boolean {
    return this.code === 'not_configured';
  }

  /** True when retrying unchanged might succeed; validation errors will not. */
  get isRetryable(): boolean {
    return this.code === 'network_error' || this.code === 'timeout' || this.code === 'api_error';
  }
}

interface ApiEnvelope {
  success?: boolean;
  error?: string;
  code?: string;
  details?: unknown;
  shipment?: LogisticsShipment;
}

/** Single place where an API response becomes either data or a LogisticsError. */
const request = async <T>(
  path: string,
  init?: RequestInit,
  /** Statuses to resolve rather than throw (validate-shipment answers 400 on invalid). */
  resolveStatuses: number[] = []
): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
  } catch (e) {
    // fetch only rejects on transport failure - server down, offline, CORS.
    throw new LogisticsError(
      e instanceof Error ? `Could not reach the logistics service: ${e.message}` : 'Could not reach the logistics service.',
      { code: 'network_error' }
    );
  }

  let body: (ApiEnvelope & T) | null = null;
  try {
    body = (await res.json()) as ApiEnvelope & T;
  } catch {
    if (!res.ok) throw new LogisticsError(`Logistics request failed (HTTP ${res.status}).`, { code: 'api_error', status: res.status });
    throw new LogisticsError('Logistics service returned a malformed response.', { code: 'malformed_response', status: res.status });
  }

  if (!res.ok && !resolveStatuses.includes(res.status)) {
    throw new LogisticsError(body?.error || `Logistics request failed (HTTP ${res.status}).`, {
      code: body?.code,
      status: res.status,
      details: body?.details,
      shipment: body?.shipment,
    });
  }
  return body as T;
};

/**
 * Is logistics configured? Cheap, hits no provider, returns no secrets.
 * Use it to decide whether to show logistics UI at all.
 */
export const getLogisticsStatus = (): Promise<LogisticsConfigStatus> =>
  request<LogisticsConfigStatus>('/status');

/**
 * Can we deliver to this pincode? Call before offering delivery - it is the
 * cheapest way to catch a bad address, long before anything is booked.
 */
export const checkServiceability = (pin: string): Promise<PincodeServiceability> =>
  request<PincodeServiceability>(`/serviceability?pin=${encodeURIComponent(pin)}`);

/**
 * Dry-run the shipment payload. Calls no provider and books nothing, so it is
 * free to call on form blur; `errors` is field-by-field and display-ready.
 */
export const validateShipment = async (body: ShipmentRequest): Promise<ShipmentValidation> => {
  const data = await request<ShipmentValidation & ApiEnvelope>(
    '/validate-shipment',
    { method: 'POST', body: JSON.stringify(body) },
    [400] // an invalid payload answers 400 with the error list - that is data, not a failure
  );
  // A 400 can also mean something other than validation (e.g. invalid_json). Only
  // a body that actually carries the verdict counts as a validation result.
  if (typeof data.valid !== 'boolean') {
    throw new LogisticsError(data.error || 'Shipment validation returned an unexpected response.', {
      code: data.code,
      status: 400,
      details: data.details,
    });
  }
  return { valid: data.valid, errors: Array.isArray(data.errors) ? data.errors : [] };
};

/**
 * Book a real pickup and delivery. This costs money and dispatches a vehicle -
 * validate first, and never call it speculatively or in a retry loop.
 *
 * Throws LogisticsError with code `shipment_exists` (409) if the order is already
 * booked; that error carries the existing shipment on `.shipment`.
 */
export const createShipment = async (body: ShipmentRequest): Promise<LogisticsShipment> => {
  const data = await request<{ shipment: LogisticsShipment }>('/create-shipment', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.shipment;
};

/**
 * Live status for one AWB. Server-side this also refreshes the stored order, so
 * `orderId` comes back when the AWB belongs to a known order.
 *
 * Polling: 30-60s is plenty. Provider scans update in minutes, not seconds.
 */
export const trackShipment = (awb: string): Promise<{ orderId: string | null; tracking: ShipmentTracking }> =>
  request<{ orderId: string | null; tracking: ShipmentTracking }>(`/track/${encodeURIComponent(awb)}`);

/** Cancel a booked shipment. Also flips the stored order to shipment_cancelled. */
export const cancelShipment = (awb: string): Promise<ShipmentCancellation> =>
  request<ShipmentCancellation>('/cancel-shipment', { method: 'POST', body: JSON.stringify({ awb }) });

/**
 * Pre-fetch AWB numbers. Optional - create-shipment assigns one automatically
 * for single-piece shipments, which is all we book today.
 */
export const fetchWaybills = async (count = 1): Promise<string[]> => {
  const data = await request<{ count: number; waybills: string[] }>(`/waybills?count=${count}`);
  return data.waybills;
};

/**
 * Register a pickup location with the provider. Required once per warehouse
 * before its name can be used as a shipment's pickup, and the name must then
 * match exactly. Typically an ops/admin action, not part of the buyer flow.
 */
export const registerWarehouse = async (warehouse: {
  name: string;
  address: string;
  city: string;
  state?: string;
  pin: string | number;
  phone: string;
  country?: string;
}): Promise<{ name: string; pin: string | number; active: boolean }> => {
  const data = await request<{ warehouse: { name: string; pin: string | number; active: boolean } }>('/warehouse', {
    method: 'POST',
    body: JSON.stringify(warehouse),
  });
  return data.warehouse;
};

/**
 * Convenience for the common "should I show logistics?" check: resolves false
 * rather than throwing when the integration is unconfigured or unreachable.
 */
export const isLogisticsAvailable = async (): Promise<boolean> => {
  try {
    return (await getLogisticsStatus()).configured;
  } catch {
    return false;
  }
};

export const logisticsService = {
  getLogisticsStatus,
  checkServiceability,
  validateShipment,
  createShipment,
  trackShipment,
  cancelShipment,
  fetchWaybills,
  registerWarehouse,
  isLogisticsAvailable,
};

export default logisticsService;
