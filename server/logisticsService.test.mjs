// Tests for the Delhivery logistics integration.
//
// Everything here runs against a local mock Delhivery server (started below and
// pointed at via DELHIVERY_BASE_URL) using safe fake data. No real credentials
// and no real Delhivery traffic are involved.
//
//   node --test server/logisticsService.test.mjs

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const TEST_ENV = {
  DELHIVERY_API_KEY: 'test-token-not-a-real-key',
  DELHIVERY_CLIENT_NAME: 'FarmDirect Test',
  DELHIVERY_PICKUP_NAME: 'FarmDirect Ghaziabad Hub',
  DELHIVERY_PICKUP_PHONE: '9876500001',
  DELHIVERY_PICKUP_ADDRESS: 'Plot 12, Dasna Industrial Area',
  DELHIVERY_PICKUP_CITY: 'Ghaziabad',
  DELHIVERY_PICKUP_STATE: 'Uttar Pradesh',
  DELHIVERY_PICKUP_PIN: '201015',
  DELHIVERY_SELLER_GST_TIN: '09AAACT0000A1Z0',
  DELHIVERY_HSN_CODE: '0702',
  DELHIVERY_TIMEOUT_MS: '4000',
};
for (const [key, value] of Object.entries(TEST_ENV)) process.env[key] = value;

const {
  buildDelhiveryPayload,
  cancelByAwb,
  createShipmentForOrder,
  DelhiveryError,
  mapDelhiveryStatus,
  normalizePhone,
  normalizePin,
  normalizeTracking,
  shipmentInputFromOrder,
  toGrams,
  trackByAwb,
  validateShipmentInput,
} = await import('./logisticsService.mjs');
const { checkPincodeServiceability, getConfigStatus } = await import('./delhiveryService.mjs');

// --- Mock Delhivery ---------------------------------------------------------
const received = [];
let server;

const mockServer = () =>
  http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const url = new URL(req.url, 'http://localhost');
      received.push({ path: url.pathname, method: req.method, auth: req.headers.authorization, body, query: url.searchParams });
      const json = (status, payload) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };

      if (req.headers.authorization !== `Token ${TEST_ENV.DELHIVERY_API_KEY}`) return json(401, { error: 'unauthorized' });

      if (url.pathname === '/api/cmu/create.json') {
        const data = JSON.parse(body.replace(/^format=json&data=/, ''));
        const shipment = data.shipments[0];
        if (shipment.order === 'ord-duplicate') {
          // Delhivery answers HTTP 200 for business failures.
          return json(200, {
            success: false, error: true, rmk: '', package_count: 1, upload_wbn: 'UPL-TEST-2',
            packages: [{ status: 'Fail', waybill: '', refnum: shipment.order, remarks: 'Duplicate order id' }],
          });
        }
        return json(200, {
          success: true, error: false, package_count: 1, upload_wbn: 'UPL-TEST-1', cod_amount: shipment.cod_amount,
          packages: [{ status: 'Success', waybill: '1234512345678', refnum: shipment.order, remarks: '', sort_code: 'GZB/DSN', cod_amount: shipment.cod_amount, payment: shipment.payment_mode }],
        });
      }

      if (url.pathname === '/api/v1/packages/json/') {
        if (url.searchParams.get('waybill') === '9999999999999') return json(200, { ShipmentData: [] });
        return json(200, {
          ShipmentData: [{
            Shipment: {
              AWB: url.searchParams.get('waybill'), ReferenceNo: 'ord-test-1', Origin: 'Ghaziabad', Destination: 'Delhi',
              OrderType: 'Prepaid', ChargedWeight: 500000, PickUpDate: '2026-09-20T09:00:00',
              ExpectedDeliveryDate: '2026-09-22T18:00:00', Consignee: { Name: 'Delhi Fresh Mart', City: 'Delhi' },
              Status: { Status: 'In Transit', StatusType: 'UD', StatusLocation: 'Ghaziabad_Hub (Uttar Pradesh)', StatusDateTime: '2026-09-21T11:00:00', Instructions: 'Shipment picked up' },
              Scans: [
                { ScanDetail: { Scan: 'Manifested', ScanType: 'UD', ScanDateTime: '2026-09-20T08:00:00', ScannedLocation: 'Ghaziabad', Instructions: 'Manifest uploaded' } },
                { ScanDetail: { Scan: 'In Transit', ScanType: 'UD', ScanDateTime: '2026-09-21T11:00:00', ScannedLocation: 'Ghaziabad_Hub', Instructions: 'Shipment picked up' } },
              ],
            },
          }],
        });
      }

      if (url.pathname === '/api/p/edit') {
        const parsed = JSON.parse(body);
        if (parsed.waybill === '5555555555555') return json(200, { status: false, remark: 'Package already delivered' });
        return json(200, { status: true, waybill: parsed.waybill, remark: 'Shipment has been cancelled', order_id: 'ord-test-1' });
      }

      if (url.pathname === '/c/api/pin-codes/json/') {
        if (url.searchParams.get('filter_codes') === '999999') return json(200, { delivery_codes: [] });
        return json(200, { delivery_codes: [{ postal_code: { pin: 110030, cod: 'Y', pre_paid: 'Y', pickup: 'Y', district: 'South Delhi', state_code: 'DL', max_weight: 50000, max_amount: 50000 } }] });
      }

      return json(404, { error: 'not found' });
    });
  });

before(async () => {
  server = mockServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.DELHIVERY_BASE_URL = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

// --- Fixtures ---------------------------------------------------------------
const order = {
  id: 'ord-test-1',
  buyerId: 'b-001',
  allocations: [{ listing: { id: 'prod-001', name: 'Grade A Tomatoes - Green Valley FPO', expectedPricePerKg: 27 }, allocatedKg: 500 }],
  totalQuantityKg: 500,
  totalAmount: 13500,
  status: 'confirmed',
  createdAt: '2026-09-20T06:00:00.000Z',
};
const produce = { id: 'prod-001', name: 'Grade A Tomatoes', category: 'vegetables', location: 'Dasna, Ghaziabad', state: 'Uttar Pradesh', farmerId: 'f-001' };
const farmer = { id: 'f-001', name: 'Green Valley FPO', district: 'Ghaziabad', state: 'Uttar Pradesh' };
const delivery = { name: 'Delhi Fresh Mart', phone: '+91 98765 43210', address: 'Shop 4, Azadpur Mandi', city: 'Delhi', state: 'Delhi', pin: '110033' };

const inputFor = (body = {}) => shipmentInputFromOrder({ order, produce, farmer, body: { delivery, ...body } });

// --- Unit tests -------------------------------------------------------------
describe('field normalisation', () => {
  it('normalises Indian phone formats', () => {
    assert.equal(normalizePhone('9876543210'), '9876543210');
    assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
    assert.equal(normalizePhone('09876543210'), '9876543210');
    assert.equal(normalizePhone('12345'), null);
  });

  it('accepts only 6-digit pincodes', () => {
    assert.equal(normalizePin('110033'), '110033');
    assert.equal(normalizePin('11003'), null);
  });

  it('converts kg to the grams Delhivery expects', () => {
    assert.equal(toGrams(500), 500000);
    assert.equal(toGrams(0), null);
    assert.equal(toGrams('abc'), null);
  });

  it('maps Delhivery statuses onto the app ShipmentStatus union', () => {
    assert.equal(mapDelhiveryStatus('Manifested'), 'scheduled');
    assert.equal(mapDelhiveryStatus('In Transit'), 'in_transit');
    assert.equal(mapDelhiveryStatus('Delivered'), 'delivered');
    assert.equal(mapDelhiveryStatus('Canceled'), 'cancelled');
    assert.equal(mapDelhiveryStatus('RTO'), 'delayed');
  });
});

describe('validateShipmentInput', () => {
  it('accepts a complete request derived from an order', () => {
    assert.deepEqual(validateShipmentInput(inputFor()), []);
  });

  it('reports every missing consignee field', () => {
    const errors = validateShipmentInput(inputFor({ delivery: { name: '', phone: '', address: '', city: '', state: '', pin: '' } }));
    for (const field of ['delivery.name', 'delivery.address', 'delivery.city', 'delivery.state', 'delivery.pin', 'delivery.phone']) {
      assert.ok(errors.some((e) => e.startsWith(field)), `expected an error for ${field}, got ${JSON.stringify(errors)}`);
    }
  });

  it('rejects malformed phone numbers and pincodes', () => {
    const errors = validateShipmentInput(inputFor({ delivery: { ...delivery, phone: '123', pin: '11' } }));
    assert.ok(errors.some((e) => e.includes('delivery.phone')));
    assert.ok(errors.some((e) => e.includes('delivery.pin')));
  });

  it('requires a COD amount for COD shipments', () => {
    const errors = validateShipmentInput(inputFor({ paymentMode: 'COD', codAmount: 0 }));
    assert.ok(errors.some((e) => e.includes('codAmount')));
  });

  it('requires an order reference', () => {
    const input = inputFor();
    input.orderId = '';
    assert.ok(validateShipmentInput(input).some((e) => e.includes('orderId')));
  });
});

describe('buildDelhiveryPayload', () => {
  it('maps FarmDirect order data onto documented Delhivery fields', () => {
    const { shipment, pickupLocation } = buildDelhiveryPayload(inputFor());
    assert.equal(shipment.order, 'ord-test-1');
    assert.equal(shipment.name, 'Delhi Fresh Mart');
    assert.equal(shipment.phone, '9876543210');
    assert.equal(shipment.pin, '110033');
    assert.equal(shipment.payment_mode, 'Prepaid');
    assert.equal(shipment.weight, '500000');
    assert.equal(shipment.cod_amount, 0);
    assert.equal(shipment.total_amount, 13500);
    assert.equal(shipment.seller_gst_tin, TEST_ENV.DELHIVERY_SELLER_GST_TIN);
    assert.equal(shipment.hsn_code, TEST_ENV.DELHIVERY_HSN_CODE);
    assert.equal(shipment.return_pin, TEST_ENV.DELHIVERY_PICKUP_PIN);
    assert.equal(pickupLocation.name, TEST_ENV.DELHIVERY_PICKUP_NAME);
  });

  it('strips characters Delhivery rejects', () => {
    const { shipment } = buildDelhiveryPayload(inputFor({ delivery: { ...delivery, address: 'Shop #4 & 5; 100% Fresh\\ Lane' } }));
    assert.ok(!/[&#%;\\]/.test(shipment.add), `address still contains rejected characters: ${shipment.add}`);
  });
});

// --- Integration tests against the mock Delhivery ---------------------------
describe('createShipmentForOrder', () => {
  it('creates a shipment and returns the AWB', async () => {
    const shipment = await createShipmentForOrder(inputFor());
    assert.equal(shipment.provider, 'delhivery');
    assert.equal(shipment.awb, '1234512345678');
    assert.equal(shipment.orderRef, 'ord-test-1');
    assert.equal(shipment.status, 'scheduled');
    assert.equal(shipment.weightGrams, 500000);

    const call = received.find((r) => r.path === '/api/cmu/create.json');
    assert.equal(call.auth, `Token ${TEST_ENV.DELHIVERY_API_KEY}`);
    assert.ok(call.body.startsWith('format=json&data='), 'body must use the documented format=json&data= envelope');
  });

  it('surfaces a Delhivery business failure instead of faking success', async () => {
    await assert.rejects(
      () => createShipmentForOrder(inputFor({ orderId: 'ord-duplicate' })),
      (err) => err instanceof DelhiveryError && err.code === 'api_error' && /Duplicate order id/.test(err.message),
    );
  });

  it('refuses to call Delhivery when data is invalid', async () => {
    const before = received.length;
    await assert.rejects(
      () => createShipmentForOrder(inputFor({ delivery: { ...delivery, pin: 'xx' } })),
      (err) => err instanceof DelhiveryError && err.code === 'validation_failed' && Array.isArray(err.details),
    );
    assert.equal(received.length, before, 'no request should be sent when validation fails');
  });
});

describe('tracking', () => {
  it('normalises a tracking response into the app shipment shape', async () => {
    const tracking = await trackByAwb('1234512345678');
    assert.equal(tracking.status, 'in_transit');
    assert.equal(tracking.providerStatus, 'In Transit');
    assert.equal(tracking.orderRef, 'ord-test-1');
    assert.equal(tracking.trackingEvents.length, 2);
    assert.equal(tracking.trackingEvents[0].status, 'scheduled');
    assert.equal(tracking.trackingEvents[1].location, 'Ghaziabad_Hub');
  });

  it('returns a 404-style error for an unknown waybill', async () => {
    await assert.rejects(() => trackByAwb('9999999999999'), (err) => err.code === 'not_found' && err.statusCode === 404);
  });

  it('rejects a malformed AWB before calling Delhivery', async () => {
    await assert.rejects(() => trackByAwb('../etc'), (err) => err.code === 'validation_failed');
  });

  it('tolerates a missing Scans array', () => {
    const tracking = normalizeTracking({ AWB: '1', Status: { Status: 'Delivered' } });
    assert.equal(tracking.status, 'delivered');
    assert.deepEqual(tracking.trackingEvents, []);
  });
});

describe('cancellation', () => {
  it('cancels a shipment', async () => {
    const result = await cancelByAwb('1234512345678');
    assert.equal(result.cancelled, true);
    assert.equal(result.remark, 'Shipment has been cancelled');
  });

  it('reports a refused cancellation', async () => {
    await assert.rejects(
      () => cancelByAwb('5555555555555'),
      (err) => err.code === 'api_error' && /already delivered/.test(err.message),
    );
  });
});

describe('serviceability', () => {
  it('reports a serviceable pincode', async () => {
    const result = await checkPincodeServiceability('110030');
    assert.equal(result.serviceable, true);
    assert.equal(result.cod, true);
  });

  it('reports a non-serviceable pincode', async () => {
    assert.equal((await checkPincodeServiceability('999999')).serviceable, false);
  });
});

describe('credential safety', () => {
  it('never exposes the API key in the status payload', () => {
    const status = getConfigStatus();
    assert.equal(status.configured, true);
    assert.equal(JSON.stringify(status).includes(TEST_ENV.DELHIVERY_API_KEY), false);
  });

  it('fails clearly when no API key is configured', async () => {
    const saved = process.env.DELHIVERY_API_KEY;
    delete process.env.DELHIVERY_API_KEY;
    try {
      await assert.rejects(
        () => createShipmentForOrder(inputFor()),
        (err) => err.code === 'not_configured' && err.statusCode === 503,
      );
      assert.equal(getConfigStatus().configured, false);
    } finally {
      process.env.DELHIVERY_API_KEY = saved;
    }
  });

  it('rejects a wrong API key with an auth error', async () => {
    const saved = process.env.DELHIVERY_API_KEY;
    process.env.DELHIVERY_API_KEY = 'wrong-key';
    try {
      await assert.rejects(() => trackByAwb('1234512345678'), (err) => err.code === 'auth_failed');
    } finally {
      process.env.DELHIVERY_API_KEY = saved;
    }
  });
});
