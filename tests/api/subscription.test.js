import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { superAdminToken, tokenFor, TENANT } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;

describe('Shop subscription view', () => {
  let provisionedSlug;
  let provisionedToken;

  beforeAll(async () => {
    const su = await superAdminToken();
    const plan = await query(`SELECT id FROM subscription_plans WHERE name = 'Basic' LIMIT 1`);
    const sfx = randomUUID().slice(0, 8);
    provisionedSlug = `sub-${sfx}`;
    await request(app)
      .post('/admin/v1/tenants')
      .set('Authorization', `Bearer ${su}`)
      .send({
        name: 'Sub',
        slug: provisionedSlug,
        owner_email: `o-${sfx}@dsm.test`,
        plan_id: plan.rows[0].id,
      });
    provisionedToken = await tokenFor('shop_admin', provisionedSlug);
  });

  it('returns the subscription with plan, limits, and usage', async () => {
    const res = await request(app)
      .get('/api/v1/subscription')
      .set('Host', host(provisionedSlug))
      .set('Authorization', `Bearer ${provisionedToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plan.name).toBe('Basic');
    expect(res.body.data.limits).toHaveProperty('max_users');
    expect(res.body.data.usage).toHaveProperty('users');
    expect(res.body.data.status).toBe('trialing');
  });

  it('404s when a tenant has no subscription', async () => {
    const token = await tokenFor('shop_admin', TENANT.A);
    const res = await request(app)
      .get('/api/v1/subscription')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('forbids non-admin roles', async () => {
    const token = await tokenFor('sales_attendant', TENANT.A);
    const res = await request(app)
      .get('/api/v1/subscription')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
