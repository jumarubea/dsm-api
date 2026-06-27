import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { tokenFor, superAdminToken, TENANT } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;
const key = () => randomUUID();
const get = (path, token, slug = TENANT.A) =>
  request(app).get(path).set('Host', host(slug)).set('Authorization', `Bearer ${token}`);

let admin;
let attendant;

beforeAll(async () => {
  [admin, attendant] = await Promise.all([
    tokenFor('shop_admin', TENANT.A),
    tokenFor('sales_attendant', TENANT.A),
  ]);
});

describe('Reports', () => {
  it('daily returns a summary and validates the date', async () => {
    const res = await get('/api/v1/reports/daily', admin);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('date');
    expect(Array.isArray(res.body.data.by_method)).toBe(true);

    const bad = await get('/api/v1/reports/daily?date=notadate', admin);
    expect(bad.status).toBe(422);
  });

  it('daily supports CSV output', async () => {
    const res = await get('/api/v1/reports/daily?format=csv', admin);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('monthly returns a summary', async () => {
    const res = await get('/api/v1/reports/monthly', admin);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('month');
  });

  it('fast-moving returns a ranked array (and CSV)', async () => {
    const res = await get('/api/v1/reports/fast-moving', admin);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const csv = await get('/api/v1/reports/fast-moving?format=csv', admin);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
  });

  it('dead-stock returns an array', async () => {
    const res = await get('/api/v1/reports/dead-stock', admin);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('profit is restricted to admin/manager', async () => {
    const denied = await get('/api/v1/reports/profit', attendant);
    expect(denied.status).toBe(403);

    const ok = await get('/api/v1/reports/profit', admin);
    expect(ok.status).toBe(200);
    expect(ok.body.data).toHaveProperty('revenue');
    expect(ok.body.data).toHaveProperty('cost');
    expect(ok.body.data).toHaveProperty('profit');
  });

  it('computes profit exactly for an isolated tenant', async () => {
    const sfx = randomUUID().slice(0, 8);
    const slug = `rpt-${sfx}`;
    const su = await superAdminToken();
    const plan = await query(`SELECT id FROM subscription_plans WHERE name = 'Pro' LIMIT 1`);

    const created = await request(app)
      .post('/admin/v1/tenants')
      .set('Authorization', `Bearer ${su}`)
      .set('Idempotency-Key', key())
      .send({ name: 'Rpt', slug, owner_email: `o-${sfx}@dsm.test`, plan_id: plan.rows[0].id });
    expect(created.status).toBe(201);

    const token = await tokenFor('shop_admin', slug);
    const cat = await request(app)
      .post('/api/v1/categories')
      .set('Host', host(slug))
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key())
      .send({ name: 'Jumla' });
    const product = await request(app)
      .post('/api/v1/products')
      .set('Host', host(slug))
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key())
      .send({
        name: 'Bidhaa',
        category_id: cat.body.data.id,
        unit_of_measure: 'pc',
        retail_price: 1000,
        wholesale_price: 1000,
        cost_price: 600,
      });
    await request(app)
      .post('/api/v1/inventory/stock-in')
      .set('Host', host(slug))
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key())
      .send({ product_id: product.body.data.id, quantity: 10 });
    await request(app)
      .post('/api/v1/sales')
      .set('Host', host(slug))
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key())
      .send({ payment_method: 'cash', items: [{ product_id: product.body.data.id, quantity: 2 }] });

    const res = await get('/api/v1/reports/profit', token, slug);
    expect(res.status).toBe(200);
    expect(Number(res.body.data.revenue)).toBe(2000);
    expect(Number(res.body.data.cost)).toBe(1200);
    expect(Number(res.body.data.profit)).toBe(800);
  });
});
