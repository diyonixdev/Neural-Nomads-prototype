// FarmDirect logistics business logic.
//
// Sits between the marketplace (orders created when a buyer is matched with a
// farmer's produce in POST /api/orders) and delhiveryService.mjs. This module
// owns validation, the FarmDirect -> Delhivery field mapping and the
// normalisation of Delhivery responses into the shapes the app already uses
// (see ShipmentStatus in src/types/index.ts).

import {
  DelhiveryError,
  cancelShipment as delhiveryCancelShipment,
  createShipment as delhiveryCreateShipment,
  getConfig,
  sanitizeText,
  trackShipment as delhiveryTrackShipment,
} from './delhiveryService.mjs';

export { DelhiveryError };

/** Maps Delhivery status strings onto the app's existing ShipmentStatus union. */
const STATUS_MAP = {
  manifested: 'scheduled',
  'not picked': 'scheduled',
  open: 'scheduled',
  scheduled: 'scheduled',
  pending: 'scheduled',
  'in transit': 'in_transit',
  intransit: 'in_transit',
  dispatched: 'in_transit',
  'picked up': 'loading',
  pickedup: 'loading',
  delivered: 'delivered',
  rto: 'delayed',
  dto: 'delayed',
  lost: 'delayed',
  undelivered: 'delayed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  returned: 'cancelled',
};

export const mapDelhiveryStatus = (status, statusType) => {
  const key = String(status || '').trim().toLowerCase();
  if (STATUS_MAP[key]) return STATUS_MAP[key];
  const typeKey = String(statusType || '').trim().toLowerCase();
  if (STATUS_MAP[typeKey]) return STATUS_MAP[typeKey];
  if (key.includes('transit')) return 'in_transit';
  if (key.includes('deliver')) return 'delivered';
  return 'scheduled';
};

/** Accepts 9876543210, +91 9876543210, 0091-98765 43210 -> "9876543210". */
export const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);
  return null;
};

export const normalizePin = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
};

/** Converts the marketplace's kg quantities into the grams Delhivery expects. */
export const toGrams = (quantityKg) => {
  const kg = Number(quantityKg);
  if (!Number.isFinite(kg) || kg <= 0) return null;
  return Math.round(kg * 1000);
};

const partyErrors = (party, label) => {
  const errors = [];
  if (!party || typeof party !== 'object') {
    errors.push(`${label} details are required`);
    return errors;
  }
  if (!sanitizeText(party.name, 100)) errors.push(`${label}.name is required`);
  if (!sanitizeText(party.address, 250)) errors.push(`${label}.address is required`);
  if (!sanitizeText(party.city, 100)) errors.push(`${label}.city is required`);
  if (!sanitizeText(party.state, 100)) errors.push(`${label}.state is required`);
  if (!normalizePin(party.pin)) errors.push(`${label}.pin must be a 6-digit pincode`);
  if (!normalizePhone(party.phone)) errors.push(`${label}.phone must be a valid 10-digit Indian mobile number`);
  return errors;
};

/**
 * Validates everything Delhivery needs before a single byte leaves the server.
 * @returns {string[]} human-readable errors; empty when the request is valid.
 */
export const validateShipmentInput = (input) => {
  const errors = [];
  if (!input || typeof input !== 'object') return ['Request body is required'];

  if (!sanitizeText(input.orderId, 60)) errors.push('orderId (order/reference id) is required');

  errors.push(...partyErrors(input.pickup, 'pickup'));
  errors.push(...partyErrors(input.delivery, 'delivery'));

  if (!sanitizeText(input.commodity, 120)) errors.push('commodity (product description) is required');

  const grams = toGrams(input.quantityKg);
  if (!grams) errors.push('quantityKg must be a number greater than 0');

  const paymentMode = String(input.paymentMode || 'Prepaid');
  if (!['Prepaid', 'COD'].includes(paymentMode)) errors.push('paymentMode must be "Prepaid" or "COD"');
  if (paymentMode === 'COD' && !(Number(input.codAmount) > 0)) {
    errors.push('codAmount must be greater than 0 for COD shipments');
  }

  const cfg = getConfig();
  const warehouseName = sanitizeText(input.pickup?.warehouseName || cfg.pickupName, 100);
  if (!warehouseName) {
    errors.push(
      'pickup.warehouseName is required (or set DELHIVERY_PICKUP_NAME) and must exactly match a warehouse registered with Delhivery',
    );
  }
  if (!sanitizeText(input.sellerGstTin || cfg.sellerGstTin, 20)) {
    errors.push('sellerGstTin is required by Delhivery (or set DELHIVERY_SELLER_GST_TIN)');
  }
  if (!sanitizeText(input.hsnCode || cfg.hsnCode, 20)) {
    errors.push('hsnCode is required by Delhivery (or set DELHIVERY_HSN_CODE)');
  }

  return errors;
};

/** Builds the exact Delhivery `shipments[0]` + `pickup_location` payload. */
export const buildDelhiveryPayload = (input) => {
  const cfg = getConfig();
  const paymentMode = input.paymentMode === 'COD' ? 'COD' : 'Prepaid';
  const totalAmount = Number(input.totalAmount) > 0 ? Number(input.totalAmount) : 0;
  const quantityKg = Number(input.quantityKg);

  const shipment = {
    name: sanitizeText(input.delivery.name, 100),
    add: sanitizeText(input.delivery.address, 250),
    city: sanitizeText(input.delivery.city, 100),
    state: sanitizeText(input.delivery.state, 100),
    country: sanitizeText(input.delivery.country || 'India', 50),
    pin: normalizePin(input.delivery.pin),
    phone: normalizePhone(input.delivery.phone),
    order: sanitizeText(input.orderId, 60),
    order_date: input.orderDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
    payment_mode: paymentMode,
    cod_amount: paymentMode === 'COD' ? Number(input.codAmount) : 0,
    total_amount: totalAmount,
    products_desc: sanitizeText(`${input.commodity} ${quantityKg}kg`, 120),
    quantity: String(input.pieces && Number(input.pieces) > 0 ? Math.floor(Number(input.pieces)) : 1),
    weight: String(toGrams(quantityKg)),
    shipping_mode: input.shippingMode === 'Express' ? 'Express' : 'Surface',
    category_of_goods: sanitizeText(input.categoryOfGoods || 'Agricultural Produce', 60),
    seller_name: sanitizeText(input.pickup.name, 100),
    seller_add: sanitizeText(input.pickup.address, 250),
    seller_gst_tin: sanitizeText(input.sellerGstTin || cfg.sellerGstTin, 20),
    hsn_code: sanitizeText(input.hsnCode || cfg.hsnCode, 20),
    // Returns go back to the farmer / pickup warehouse.
    return_name: sanitizeText(input.pickup.name, 100),
    return_add: sanitizeText(input.pickup.address, 250),
    return_city: sanitizeText(input.pickup.city, 100),
    return_state: sanitizeText(input.pickup.state, 100),
    return_country: sanitizeText(input.pickup.country || 'India', 50),
    return_pin: normalizePin(input.pickup.pin),
    return_phone: normalizePhone(input.pickup.phone),
  };
  if (input.awb) shipment.waybill = sanitizeText(input.awb, 40);
  if (input.sellerInvoice) shipment.seller_inv = sanitizeText(input.sellerInvoice, 60);
  if (input.fragile === true) shipment.fragile_shipment = 'true';

  const pickupLocation = {
    name: sanitizeText(input.pickup.warehouseName || cfg.pickupName, 100),
    add: sanitizeText(input.pickup.address, 250),
    city: sanitizeText(input.pickup.city, 100),
    pin: normalizePin(input.pickup.pin),
    country: sanitizeText(input.pickup.country || 'India', 50),
    phone: normalizePhone(input.pickup.phone),
  };

  return { shipment, pickupLocation };
};

/**
 * Derives a shipment request from an existing FarmDirect order plus the
 * address/contact details the caller supplies. Order data is the source of
 * truth for reference id, commodity, weight and amount; nothing is invented.
 */
export const shipmentInputFromOrder = ({ order, produce, farmer, body = {} }) => {
  const firstAllocation = order?.allocations?.[0] ?? null;
  const commodity =
    body.commodity ||
    produce?.name ||
    firstAllocation?.listing?.name ||
    null;
  const quantityKg =
    body.quantityKg ??
    order?.totalQuantityKg ??
    firstAllocation?.allocatedKg ??
    null;

  const cfg = getConfig();
  const pickupFromProduce = produce?.location ? String(produce.location) : '';
  const pickupCityFallback = pickupFromProduce.includes(',')
    ? pickupFromProduce.split(',').pop().trim()
    : pickupFromProduce;

  return {
    orderId: body.orderId || order?.id || null,
    orderDate: body.orderDate || (order?.createdAt ? String(order.createdAt).slice(0, 19).replace('T', ' ') : undefined),
    commodity,
    quantityKg,
    totalAmount: body.totalAmount ?? order?.totalAmount ?? 0,
    paymentMode: body.paymentMode || 'Prepaid',
    codAmount: body.codAmount ?? 0,
    shippingMode: body.shippingMode,
    categoryOfGoods: body.categoryOfGoods || produce?.category || 'Agricultural Produce',
    pieces: body.pieces,
    fragile: body.fragile,
    awb: body.awb,
    sellerGstTin: body.sellerGstTin,
    hsnCode: body.hsnCode,
    sellerInvoice: body.sellerInvoice,
    pickup: {
      warehouseName: body.pickup?.warehouseName || cfg.pickupName,
      name: body.pickup?.name || farmer?.name || cfg.pickupName,
      phone: body.pickup?.phone || farmer?.phone || cfg.pickupPhone,
      address: body.pickup?.address || cfg.pickupAddress || pickupFromProduce,
      city: body.pickup?.city || farmer?.district || cfg.pickupCity || pickupCityFallback,
      state: body.pickup?.state || farmer?.state || produce?.state || cfg.pickupState,
      pin: body.pickup?.pin || cfg.pickupPin,
      country: body.pickup?.country || 'India',
    },
    delivery: {
      name: body.delivery?.name || null,
      phone: body.delivery?.phone || null,
      address: body.delivery?.address || null,
      city: body.delivery?.city || null,
      state: body.delivery?.state || null,
      pin: body.delivery?.pin || null,
      country: body.delivery?.country || 'India',
    },
  };
};

/**
 * Validates, calls Delhivery, and returns the shipment record FarmDirect stores
 * on the order. Throws DelhiveryError on any failure — never a fake success.
 */
export const createShipmentForOrder = async (input) => {
  const errors = validateShipmentInput(input);
  if (errors.length) {
    throw new DelhiveryError('Shipment data is incomplete or invalid.', {
      code: 'validation_failed',
      statusCode: 400,
      details: errors,
    });
  }

  const { shipment, pickupLocation } = buildDelhiveryPayload(input);
  const result = await delhiveryCreateShipment({ shipment, pickupLocation });
  const now = new Date().toISOString();

  return {
    provider: 'delhivery',
    awb: result.awb,
    orderRef: shipment.order,
    refNum: result.refNum,
    status: 'scheduled',
    paymentMode: shipment.payment_mode,
    codAmount: shipment.cod_amount,
    quantityKg: Number(input.quantityKg),
    weightGrams: Number(shipment.weight),
    commodity: shipment.products_desc,
    shippingMode: shipment.shipping_mode,
    sortCode: result.sortCode,
    uploadWbn: result.uploadWbn,
    remarks: result.remarks,
    pickup: { name: pickupLocation.name, city: pickupLocation.city, pin: pickupLocation.pin },
    delivery: { name: shipment.name, city: shipment.city, state: shipment.state, pin: shipment.pin },
    createdAt: now,
    updatedAt: now,
  };
};

/** Normalises a Delhivery tracking payload into the app's shipment vocabulary. */
export const normalizeTracking = (delhiveryShipment) => {
  const status = delhiveryShipment?.Status ?? {};
  const scans = Array.isArray(delhiveryShipment?.Scans) ? delhiveryShipment.Scans : [];
  return {
    provider: 'delhivery',
    awb: delhiveryShipment?.AWB ? String(delhiveryShipment.AWB) : null,
    orderRef: delhiveryShipment?.ReferenceNo ? String(delhiveryShipment.ReferenceNo) : null,
    status: mapDelhiveryStatus(status.Status, status.StatusType),
    providerStatus: status.Status ?? null,
    statusLocation: status.StatusLocation ?? null,
    statusUpdatedAt: status.StatusDateTime ?? null,
    instructions: status.Instructions ?? null,
    origin: delhiveryShipment?.Origin ?? null,
    destination: delhiveryShipment?.Destination ?? null,
    pickedUpAt: delhiveryShipment?.PickUpDate ?? null,
    deliveredAt: delhiveryShipment?.DeliveryDate ?? null,
    expectedDeliveryAt: delhiveryShipment?.ExpectedDeliveryDate ?? null,
    orderType: delhiveryShipment?.OrderType ?? null,
    chargedWeightGrams: delhiveryShipment?.ChargedWeight ?? null,
    consigneeName: delhiveryShipment?.Consignee?.Name ?? null,
    trackingEvents: scans
      .map((entry) => entry?.ScanDetail ?? entry)
      .filter(Boolean)
      .map((scan, index) => ({
        id: `scan-${index + 1}`,
        timestamp: scan.ScanDateTime ?? null,
        status: mapDelhiveryStatus(scan.Scan, scan.ScanType),
        providerStatus: scan.Scan ?? null,
        location: scan.ScannedLocation ?? null,
        note: scan.Instructions ?? null,
      })),
  };
};

export const trackByAwb = async (awb) => {
  const waybill = String(awb || '').trim();
  if (!/^[A-Za-z0-9]{6,40}$/.test(waybill)) {
    throw new DelhiveryError('awb must be a valid Delhivery waybill number.', {
      code: 'validation_failed',
      statusCode: 400,
    });
  }
  const shipments = await delhiveryTrackShipment({ waybill });
  const normalized = normalizeTracking(shipments[0]);
  if (!normalized.awb) normalized.awb = waybill;
  return normalized;
};

export const cancelByAwb = async (awb) => {
  const waybill = String(awb || '').trim();
  if (!/^[A-Za-z0-9]{6,40}$/.test(waybill)) {
    throw new DelhiveryError('awb must be a valid Delhivery waybill number.', {
      code: 'validation_failed',
      statusCode: 400,
    });
  }
  return delhiveryCancelShipment(waybill);
};
