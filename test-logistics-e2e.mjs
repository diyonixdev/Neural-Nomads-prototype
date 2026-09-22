// End-to-end check of the logistics HTTP routes on the real FarmDirect server,
// with a mock Delhivery standing in for the provider. Safe fake data only.
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT = process.argv[2] || process.cwd();
const NODE = process.argv[3] || process.execPath;
const ORDERS = path.join(PROJECT, 'server', 'data', 'orders-store.json');
const BACKUP = ORDERS + '.e2e-backup';
fs.copyFileSync(ORDERS, BACKUP);

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : ' :: ' + extra}`);
  if (!cond) failures++;
};

// --- mock Delhivery ---
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const json = (s, p) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(p)); };
    if (req.headers.authorization !== 'Token e2e-fake-token') return json(401, { error: 'unauthorized' });
    if (url.pathname === '/api/cmu/create.json') {
      const d = JSON.parse(body.replace(/^format=json&data=/, ''));
      const s = d.shipments[0];
      return json(200, { success: true, error: false, package_count: 1, upload_wbn: 'UPL-E2E',
        packages: [{ status: 'Success', waybill: '7770001112223', refnum: s.order, remarks: '', sort_code: 'GZB/DSN', cod_amount: s.cod_amount, payment: s.payment_mode }] });
    }
    if (url.pathname === '/api/v1/packages/json/') {
      return json(200, { ShipmentData: [{ Shipment: { AWB: url.searchParams.get('waybill'), ReferenceNo: 'e2e', Origin: 'Ghaziabad', Destination: 'Delhi',
        Status: { Status: 'In Transit', StatusType: 'UD', StatusLocation: 'Ghaziabad_Hub', StatusDateTime: '2026-09-21T11:00:00', Instructions: 'picked up' },
        Scans: [{ ScanDetail: { Scan: 'Manifested', ScanDateTime: '2026-09-20T08:00:00', ScannedLocation: 'Ghaziabad' } }] } }] });
    }
    if (url.pathname === '/api/p/edit') return json(200, { status: true, waybill: JSON.parse(body).waybill, remark: 'Shipment has been cancelled', order_id: 'e2e' });
    if (url.pathname === '/c/api/pin-codes/json/') return json(200, { delivery_codes: [{ postal_code: { pin: 110033, cod: 'Y', pre_paid: 'Y', pickup: 'Y', district: 'North Delhi', state_code: 'DL' } }] });
    return json(404, { error: 'not found' });
  });
});
await new Promise((r) => mock.listen(0, '127.0.0.1', r));
const MOCK_URL = `http://127.0.0.1:${mock.address().port}`;

// --- real FarmDirect server ---
const PORT = 8899;
const child = spawn(NODE, ['server/aiIntentApi.mjs'], {
  cwd: PROJECT,
  env: { ...process.env,
    AI_INTENT_PORT: String(PORT), PORT: String(PORT), HOST: '127.0.0.1',
    DELHIVERY_API_KEY: 'e2e-fake-token', DELHIVERY_BASE_URL: MOCK_URL,
    DELHIVERY_PICKUP_NAME: 'FarmDirect Ghaziabad Hub', DELHIVERY_PICKUP_PHONE: '9876500001',
    DELHIVERY_PICKUP_ADDRESS: 'Plot 12, Dasna Industrial Area', DELHIVERY_PICKUP_CITY: 'Ghaziabad',
    DELHIVERY_PICKUP_STATE: 'Uttar Pradesh', DELHIVERY_PICKUP_PIN: '201015',
    DELHIVERY_SELLER_GST_TIN: '09AAACT0000A1Z0', DELHIVERY_HSN_CODE: '0702' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (d) => (serverLog += d));
child.stderr.on('data', (d) => (serverLog += d));

const base = `http://127.0.0.1:${PORT}`;
const api = async (method, p, body) => {
  const res = await fetch(base + p, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => null) };
};
for (let i = 0; i < 60; i++) {
  try { await fetch(base + '/health'); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
}

const delivery = { name: 'Delhi Fresh Mart', phone: '+91 98765 43210', address: 'Shop 4, Azadpur Mandi', city: 'Delhi', state: 'Delhi', pin: '110033' };

try {
  let r = await api('GET', '/api/logistics/status');
  check('GET /api/logistics/status reports configured', r.status === 200 && r.body.configured === true, JSON.stringify(r.body));
  check('status payload contains no API key', !JSON.stringify(r.body).includes('e2e-fake-token'));

  r = await api('GET', '/api/logistics/serviceability?pin=110033');
  check('GET /api/logistics/serviceability', r.status === 200 && r.body.serviceable === true, JSON.stringify(r.body));

  r = await api('GET', '/api/logistics/serviceability?pin=abc');
  check('serviceability rejects a bad pin with 400', r.status === 400 && r.body.code === 'validation_failed', JSON.stringify(r.body));

  // Existing flow untouched: order without logistics opt-in
  r = await api('POST', '/api/orders', { buyerId: 'b-002', allocations: [{ listing: { id: 'prod-001', name: 'Grade A Tomatoes', expectedPricePerKg: 27 }, allocatedKg: 100 }] });
  check('POST /api/orders still works unchanged', r.status === 200 && r.body.success === true && !('logistics' in r.body), JSON.stringify(r.body).slice(0, 200));

  // Matched order + logistics opt-in
  r = await api('POST', '/api/orders', {
    buyerId: 'b-002',
    allocations: [{ listing: { id: 'prod-001', name: 'Grade A Tomatoes', expectedPricePerKg: 27 }, allocatedKg: 500 }],
    createShipment: true,
    logistics: { delivery },
  });
  const bookedOrderId = r.body?.order?.id;
  check('POST /api/orders books a shipment when opted in', r.status === 200 && r.body.order?.shipment?.awb === '7770001112223' && r.body.order.status === 'shipment_booked', JSON.stringify(r.body).slice(0, 300));

  r = await api('POST', '/api/logistics/validate-shipment', { orderId: bookedOrderId, delivery: { ...delivery, phone: '123', pin: '11' } });
  check('validate-shipment reports field errors', r.status === 400 && r.body.valid === false && r.body.errors.some((e) => e.includes('delivery.phone')), JSON.stringify(r.body));

  r = await api('POST', '/api/logistics/create-shipment', { orderId: bookedOrderId, delivery });
  check('create-shipment refuses a duplicate booking (409)', r.status === 409 && r.body.code === 'shipment_exists', JSON.stringify(r.body).slice(0, 200));

  r = await api('POST', '/api/logistics/create-shipment', { orderId: 'ord-does-not-exist', delivery });
  check('create-shipment 404s for an unknown order', r.status === 404 && r.body.code === 'order_not_found', JSON.stringify(r.body));

  // Separate order booked through the dedicated endpoint
  r = await api('POST', '/api/orders', { buyerId: 'b-001', allocations: [{ listing: { id: 'prod-002', name: 'Grade A Potatoes', expectedPricePerKg: 22 }, allocatedKg: 300 }] });
  const plainOrderId = r.body.order.id;
  r = await api('POST', '/api/logistics/create-shipment', { orderId: plainOrderId, delivery });
  check('POST /api/logistics/create-shipment books via the endpoint', r.status === 201 && r.body.shipment.awb === '7770001112223', JSON.stringify(r.body).slice(0, 300));

  r = await api('POST', '/api/logistics/create-shipment', { orderId: plainOrderId + 'x', requireOrder: false, commodity: 'Tomatoes', quantityKg: 10, delivery, pickup: {} });
  check('create-shipment works standalone with requireOrder:false', r.status === 201 && r.body.shipment.awb, JSON.stringify(r.body).slice(0, 200));

  r = await api('POST', '/api/logistics/create-shipment', { requireOrder: false, quantityKg: 10, delivery: { name: 'X' } });
  check('create-shipment 400s on incomplete data', r.status === 400 && r.body.code === 'validation_failed' && Array.isArray(r.body.details), JSON.stringify(r.body).slice(0, 300));

  r = await api('GET', '/api/logistics/track/7770001112223');
  check('GET /api/logistics/track/:awb returns normalized tracking', r.status === 200 && r.body.tracking.status === 'in_transit' && r.body.tracking.trackingEvents.length === 1, JSON.stringify(r.body).slice(0, 300));
  check('tracking links back to the stored order', r.body.orderId != null, JSON.stringify(r.body).slice(0, 200));

  r = await api('GET', '/api/orders');
  const stored = r.body.find((o) => o.id === bookedOrderId);
  check('GET /api/orders exposes the shipment on the order', !!stored?.shipment?.awb, JSON.stringify(stored).slice(0, 200));

  r = await api('POST', '/api/logistics/cancel-shipment', { awb: '7770001112223' });
  check('POST /api/logistics/cancel-shipment cancels', r.status === 200 && r.body.cancelled === true, JSON.stringify(r.body));

  r = await api('GET', '/api/orders');
  const cancelled = r.body.find((o) => o.shipment?.awb === '7770001112223');
  check('cancelled shipment status persisted on the order', cancelled?.shipment?.status === 'cancelled', JSON.stringify(cancelled?.shipment).slice(0, 200));

  // Unconfigured behaviour is verified in the unit suite; here assert no leak in logs
  check('server logs never contain the API key', !serverLog.includes('e2e-fake-token'), 'log leak');

  r = await api('GET', '/api/produce/prod-001');
  check('unrelated route /api/produce/:id unaffected', r.status === 200 && r.body.id === 'prod-001');

  r = await api('GET', '/openapi.json');
  check('/openapi.json loads and documents the logistics routes',
    r.status === 200 && !!r.body?.paths?.['/api/logistics/create-shipment'] && !!r.body?.paths?.['/api/logistics/track/{awb}'],
    String(r.status));
  check('server did not warn about a broken openapi.json', !serverLog.includes('[DOCS] Failed'));
} finally {
  child.kill();
  mock.close();
  fs.copyFileSync(BACKUP, ORDERS);
  fs.unlinkSync(BACKUP);
}

console.log(`\n${failures === 0 ? 'ALL E2E CHECKS PASSED' : failures + ' E2E CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
