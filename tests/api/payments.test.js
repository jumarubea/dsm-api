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
let admin;
let keeper;
let categoryId;

const createStockedProduct = async () => {
  const p = await request(app)
    .post('/api/v1/products')
    .set('Host', host(TENANT.A))
    .set('Authorization', `Bearer ${admin}`)
    .set('Idempotency-Key', key())
    .send({
      name: 'Pay',
      sku: `PAY-${randomUUID().slice(0, 8)}`,
      category_id: categoryId,
      unit_of_measure: 'pc',
      retail_price: 1000,
      wholesale_price: 800,
      cost_price: 600,
    });
  await request(app)
    .post('/api/v1/inventory/stock-in')
    .set('Host', host(TENANT.A))
    .set('Authorization', `Bearer ${keeper}`)
    .set('Idempotency-Key', key())
    .send({ product_id: p.body.data.id, quantity: 50 });
  return p.body.data.id;
};

const postSale = (body) =>
  request(app)
    .post('/api/v1/sales')
    .set('Host', host(TENANT.A))
    .set('Authorization', `Bearer ${attendant}`)
    .set('Idempotency-Key', key())
    .send(body);

beforeAll(async () => {
  [attendant, admin, keeper] = await Promise.all([
    tokenFor('sales_attendant', TENANT.A),
    tokenFor('shop_admin', TENANT.A),
    tokenFor('store_keeper', TENANT.A),
  ]);
  const cat = await query(
    `SELECT id FROM categories WHERE tenant_id = (SELECT id FROM tenants WHERE slug='shop-a') AND name='General'`
  );
  categoryId = cat.rows[0].id;
});

describe('M-Pesa payments (manual mode)', () => {
  it('initiate returns manual-mode guidance for an unpaid sale', async () => {
    const pid = await createStockedProduct();
    const sale = await postSale({
      payment_method: 'mpesa',
      items: [{ product_id: pid, quantity: 1 }],
    });
    const res = await request(app)
      .post('/api/v1/payments/mpesa/initiate')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`)
      .set('Idempotency-Key', key())
      .send({ sale_id: sale.body.data.id, phone: '0754000001', amount: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('manual');
    expect(res.body.data.payment_status).toBe('PENDING');
    expect(typeof res.body.data.message).toBe('string');
    expect(res.body.data.message.length).toBeGreaterThan(0);
  });

  it('initiate returns 409 for an already-paid sale', async () => {
    const pid = await createStockedProduct();
    const sale = await postSale({
      payment_method: 'cash',
      items: [{ product_id: pid, quantity: 1 }],
    });
    const res = await request(app)
      .post('/api/v1/payments/mpesa/initiate')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`)
      .set('Idempotency-Key', key())
      .send({ sale_id: sale.body.data.id, phone: '0754000001', amount: 1000 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_PAID');
  });

  it('initiate requires an Idempotency-Key', async () => {
    const pid = await createStockedProduct();
    const sale = await postSale({
      payment_method: 'mpesa',
      items: [{ product_id: pid, quantity: 1 }],
    });
    const res = await request(app)
      .post('/api/v1/payments/mpesa/initiate')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`)
      .send({ sale_id: sale.body.data.id, phone: '0754000001', amount: 1000 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('status returns manual-mode payment status', async () => {
    const pid = await createStockedProduct();
    const sale = await postSale({
      payment_method: 'mpesa',
      items: [{ product_id: pid, quantity: 1 }],
    });
    const res = await request(app)
      .get(`/api/v1/payments/mpesa/status/${sale.body.data.id}`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`);
    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('manual');
    expect(res.body.data.payment_status).toBe('PENDING');
  });

  it('status returns 404 for an unknown sale', async () => {
    const res = await request(app)
      .get(`/api/v1/payments/mpesa/status/${randomUUID()}`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`);
    expect(res.status).toBe(404);
  });
});

describe('Dead stock', () => {
  it('returns an array of dead-stock products', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/dead-stock')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
