import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { superAdminToken } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;

describe('Tenant onboarding credentials (non-production)', () => {
  let su;
  let basicPlanId;

  beforeAll(async () => {
    su = await superAdminToken();
    const plan = await query(`SELECT id FROM subscription_plans WHERE name = 'Basic' LIMIT 1`);
    basicPlanId = plan.rows[0].id;
  });

  it('returns a temp password the owner can immediately log in with', async () => {
    const sfx = randomUUID().slice(0, 8);
    const slug = `onb-${sfx}`;
    const ownerEmail = `owner-${sfx}@dsm.test`;

    const created = await request(app)
      .post('/admin/v1/tenants')
      .set('Authorization', `Bearer ${su}`)
      .send({ name: 'Onb', slug, owner_email: ownerEmail, plan_id: basicPlanId });

    expect(created.status).toBe(201);
    expect(typeof created.body.data.temp_password).toBe('string');
    expect(created.body.data.temp_password.length).toBeGreaterThan(8);

    // The owner can sign in with the returned temporary password.
    const login = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', host(slug))
      .send({ email: ownerEmail, password: created.body.data.temp_password });

    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('shop_admin');
    expect(login.body.data.user).not.toHaveProperty('password_hash');
  });
});
