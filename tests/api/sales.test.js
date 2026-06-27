import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { tokenFor, TENANT } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;
const key = () => randomUUID();

let attendant;
let manager;
let keeper;
let admin;
let shopBAdmin;
let categoryId;

const sku = () => `S-${randomUUID().slice(0, 8)}`;

const createProduct = async (overrides = {}) => {
  const res = await request(app)
    .post('/api/v1/products')
    .set('Host', host(TENANT.A))
    .set('Authorization', `Bearer ${admin}`)
    .set('Idempotency-Key', key())
    .send({
      name: 'P',
      sku: sku(),
      category_id: categoryId,
      unit_of_measure: 'pc',
      retail_price: 1000,
      wholesale_price: 800,
      cost_price: 600,
      min_stock_level: 5,
      ...overrides,
    });
  return res.body.data.id;
};

const stock = async (productId, quantity) =>
  request(app)
    .post('/api/v1/inventory/stock-in')
    .set('Host', host(TENANT.A))
    .set('Authorization', `Bearer ${keeper}`)
    .set('Idempotency-Key', key())
    .send({ product_id: productId, quantity });

const stockedProduct = async (overrides) => {
  const id = await createProduct(overrides);
  await stock(id, 100);
  return id;
};

const postSale = (token, body, idemKey = key()) =>
  request(app)
    .post('/api/v1/sales')
    .set('Host', host(TENANT.A))
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', idemKey)
    .send(body);

beforeAll(async () => {
  [attendant, manager, keeper, admin, shopBAdmin] = await Promise.all([
    tokenFor('sales_attendant', TENANT.A),
    tokenFor('manager', TENANT.A),
    tokenFor('store_keeper', TENANT.A),
    tokenFor('shop_admin', TENANT.A),
    tokenFor('shop_admin', TENANT.B),
  ]);
  const cat = await query(
    `SELECT id FROM categories WHERE tenant_id = (SELECT id FROM tenants WHERE slug='shop-a') AND name='General'`
  );
  categoryId = cat.rows[0].id;
});

describe('Sales — create', () => {
  it('creates a cash sale, completes it, and deducts stock', async () => {
    const pid = await stockedProduct();
    const res = await postSale(attendant, {
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 2 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.payment_status).toBe('COMPLETED');
    expect(Number(res.body.data.items[0].unit_price)).toBe(1000);
    expect(Number(res.body.data.total)).toBe(2000);

    const prod = await request(app)
      .get(`/api/v1/products/${pid}`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(prod.body.data.stock_qty).toBe(98);
  });

  it('auto-applies wholesale pricing at the quantity threshold', async () => {
    const pid = await stockedProduct();
    await request(app)
      .post(`/api/v1/products/${pid}/pricing-rules`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`)
      .set('Idempotency-Key', key())
      .send({ min_qty: 10, price_type: 'wholesale' });

    const res = await postSale(attendant, {
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 10 }],
    });
    expect(res.status).toBe(201);
    expect(Number(res.body.data.items[0].unit_price)).toBe(800);
  });

  it('returns 409 on a duplicate Idempotency-Key', async () => {
    const pid = await stockedProduct();
    const k = key();
    const first = await postSale(
      attendant,
      { payment_method: 'cash', items: [{ product_id: pid, quantity: 1 }] },
      k
    );
    expect(first.status).toBe(201);
    const second = await postSale(
      attendant,
      { payment_method: 'cash', items: [{ product_id: pid, quantity: 1 }] },
      k
    );
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('rejects overselling with 422', async () => {
    const pid = await stockedProduct();
    const res = await postSale(attendant, {
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 9999 }],
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('requires an Idempotency-Key', async () => {
    const pid = await stockedProduct();
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`)
      .send({ payment_method: 'cash', items: [{ product_id: pid, quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('forbids store_keeper from selling', async () => {
    const pid = await stockedProduct();
    const res = await postSale(keeper, {
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 1 }],
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('Sales — payment', () => {
  it('leaves mobile-money sales pending then confirms them manually', async () => {
    const pid = await stockedProduct();
    const sale = await postSale(attendant, {
      payment_method: 'mpesa',
      items: [{ product_id: pid, quantity: 1 }],
    });
    expect(sale.status).toBe(201);
    expect(sale.body.data.payment_status).toBe('PENDING');
    expect(sale.body.data.status).toBe('PENDING');

    const confirm = await request(app)
      .post(`/api/v1/sales/${sale.body.data.id}/confirm-payment`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`)
      .set('Idempotency-Key', key())
      .send({ reference: 'MPESA123' });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.payment_status).toBe('COMPLETED');
    expect(confirm.body.data.status).toBe('COMPLETED');

    const again = await request(app)
      .post(`/api/v1/sales/${sale.body.data.id}/confirm-payment`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`)
      .set('Idempotency-Key', key())
      .send({ reference: 'MPESA123' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_PAID');
  });

  it('marks externally-referenced payments complete at creation', async () => {
    const pid = await stockedProduct();
    const res = await postSale(attendant, {
      payment_method: 'mpesa',
      payment_reference: 'EXT1',
      items: [{ product_id: pid, quantity: 1 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.payment_status).toBe('COMPLETED');
  });
});

describe('Sales — void', () => {
  it('voids a sale, restores stock, and blocks double-void', async () => {
    const pid = await stockedProduct();
    const sale = await postSale(attendant, {
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 5 }],
    });
    const id = sale.body.data.id;

    const voided = await request(app)
      .post(`/api/v1/sales/${id}/void`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${manager}`)
      .set('Idempotency-Key', key())
      .send({ reason: 'mistake' });
    expect(voided.status).toBe(200);
    expect(voided.body.data.status).toBe('VOIDED');

    const prod = await request(app)
      .get(`/api/v1/products/${pid}`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(prod.body.data.stock_qty).toBe(100);

    const again = await request(app)
      .post(`/api/v1/sales/${id}/void`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${manager}`)
      .set('Idempotency-Key', key())
      .send({ reason: 'again' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_VOIDED');
  });

  it('forbids sales_attendant from voiding', async () => {
    const pid = await stockedProduct();
    const sale = await postSale(attendant, {
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 1 }],
    });
    const res = await request(app)
      .post(`/api/v1/sales/${sale.body.data.id}/void`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`)
      .set('Idempotency-Key', key())
      .send({ reason: 'x' });
    expect(res.status).toBe(403);
  });
});

describe('Sales — read', () => {
  it('lists sales and filters by status', async () => {
    const res = await request(app)
      .get('/api/v1/sales?status=VOIDED')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    res.body.data.forEach((s) => expect(s.status).toBe('VOIDED'));
  });

  it('returns detail with items and payments; 404 for unknown', async () => {
    const pid = await stockedProduct();
    const sale = await postSale(attendant, {
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 1 }],
    });
    const res = await request(app)
      .get(`/api/v1/sales/${sale.body.data.id}`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(Array.isArray(res.body.data.payments)).toBe(true);

    const missing = await request(app)
      .get(`/api/v1/sales/${randomUUID()}`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(missing.status).toBe(404);

    const bad = await request(app)
      .get('/api/v1/sales/abc')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(bad.status).toBe(404);
  });

  it('returns a TZS receipt', async () => {
    const pid = await stockedProduct();
    const sale = await postSale(attendant, {
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 1 }],
    });
    const res = await request(app)
      .get(`/api/v1/sales/${sale.body.data.id}/receipt`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.data.currency).toBe('TZS');
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("does not expose another tenant's sale", async () => {
    const pid = await stockedProduct();
    const sale = await postSale(attendant, {
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 1 }],
    });
    const res = await request(app)
      .get(`/api/v1/sales/${sale.body.data.id}`)
      .set('Host', host(TENANT.B))
      .set('Authorization', `Bearer ${shopBAdmin}`);
    expect(res.status).toBe(404);
  });
});

describe('Sales — delivery orders', () => {
  it('advances an order through its status flow', async () => {
    const pid = await stockedProduct();
    const order = await postSale(attendant, {
      type: 'ORDER',
      payment_method: 'cash',
      delivery_address: 'Mtaa 1',
      items: [{ product_id: pid, quantity: 1 }],
    });
    expect(order.status).toBe(201);
    expect(order.body.data.type).toBe('ORDER');
    expect(order.body.data.status).toBe('PENDING');
    const id = order.body.data.id;

    const prepared = await request(app)
      .patch(`/api/v1/sales/${id}/status`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${manager}`)
      .set('Idempotency-Key', key())
      .send({ status: 'PREPARED' });
    expect(prepared.status).toBe(200);
    expect(prepared.body.data.status).toBe('PREPARED');

    const delivered = await request(app)
      .patch(`/api/v1/sales/${id}/status`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${manager}`)
      .set('Idempotency-Key', key())
      .send({ status: 'DELIVERED' });
    expect(delivered.status).toBe(200);
    expect(delivered.body.data.status).toBe('DELIVERED');
  });

  it('rejects an invalid status jump', async () => {
    const pid = await stockedProduct();
    const order = await postSale(attendant, {
      type: 'ORDER',
      payment_method: 'cash',
      delivery_address: 'Mtaa 2',
      items: [{ product_id: pid, quantity: 1 }],
    });
    const res = await request(app)
      .patch(`/api/v1/sales/${order.body.data.id}/status`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${manager}`)
      .set('Idempotency-Key', key())
      .send({ status: 'DELIVERED' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('requires a delivery address for orders', async () => {
    const pid = await stockedProduct();
    const res = await postSale(attendant, {
      type: 'ORDER',
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 1 }],
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
