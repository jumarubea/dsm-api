import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { superAdminToken, tokenFor, TENANT } from '../helpers/auth.js';

const app = createApp();

let su;
let shopAdmin;

beforeAll(async () => {
  [su, shopAdmin] = await Promise.all([superAdminToken(), tokenFor('shop_admin', TENANT.A)]);
});

describe('Platform dashboard (admin)', () => {
  it('returns the platform summary', async () => {
    const res = await request(app).get('/admin/v1/dashboard').set('Authorization', `Bearer ${su}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tenants).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('mrr');
    expect(res.body.data).toHaveProperty('trials_expiring');
    expect(typeof res.body.data.tenants.total).toBe('number');
  });

  it('returns per-tenant health', async () => {
    const res = await request(app)
      .get('/admin/v1/dashboard/tenants-health')
      .set('Authorization', `Bearer ${su}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length) {
      expect(res.body.data[0]).toHaveProperty('slug');
      expect(res.body.data[0]).toHaveProperty('sales_this_month');
    }
  });

  it('forbids a shop_admin', async () => {
    const res = await request(app)
      .get('/admin/v1/dashboard')
      .set('Authorization', `Bearer ${shopAdmin}`);
    expect(res.status).toBe(403);
  });
});
