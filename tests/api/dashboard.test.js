import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { tokenFor, TENANT } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;
const get = (path, token) =>
  request(app).get(path).set('Host', host(TENANT.A)).set('Authorization', `Bearer ${token}`);

let admin;
let attendant;

beforeAll(async () => {
  [admin, attendant] = await Promise.all([
    tokenFor('shop_admin', TENANT.A),
    tokenFor('sales_attendant', TENANT.A),
  ]);
});

describe('Dashboard', () => {
  it('summary includes profit for privileged roles only', async () => {
    const a = await get('/api/v1/dashboard/summary', admin);
    expect(a.status).toBe(200);
    expect(typeof a.body.data.today_sales_count).toBe('number');
    expect(a.body.data).toHaveProperty('stock_value');
    expect(a.body.data).toHaveProperty('monthly_profit');

    const s = await get('/api/v1/dashboard/summary', attendant);
    expect(s.status).toBe(200);
    expect(s.body.data).not.toHaveProperty('monthly_profit');
  });

  it('chart returns daily and monthly series', async () => {
    const res = await get('/api/v1/dashboard/chart', admin);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.daily)).toBe(true);
    expect(Array.isArray(res.body.data.monthly)).toBe(true);
  });

  it('alerts are restricted from sales_attendant', async () => {
    const ok = await get('/api/v1/dashboard/alerts', admin);
    expect(ok.status).toBe(200);
    expect(Array.isArray(ok.body.data.low_stock)).toBe(true);
    expect(Array.isArray(ok.body.data.dead_stock)).toBe(true);

    const denied = await get('/api/v1/dashboard/alerts', attendant);
    expect(denied.status).toBe(403);
  });

  it('orders returns a list', async () => {
    const res = await get('/api/v1/dashboard/orders', admin);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('prices expose cost_price for privileged roles only', async () => {
    const a = await get('/api/v1/dashboard/prices', admin);
    expect(a.status).toBe(200);
    if (a.body.data.length) expect(a.body.data[0]).toHaveProperty('cost_price');

    const s = await get('/api/v1/dashboard/prices', attendant);
    expect(s.status).toBe(200);
    s.body.data.forEach((p) => expect(p).not.toHaveProperty('cost_price'));
  });
});
