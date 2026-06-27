import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { superAdminToken, tokenFor, TENANT } from '../helpers/auth.js';

const app = createApp();

let su;
let shopAdmin;

const planBody = (over = {}) => ({
  name: `Plan-${randomUUID().slice(0, 8)}`,
  price_tzs: 50000,
  billing_cycle: 'monthly',
  max_users: 5,
  max_products: 200,
  ...over,
});

beforeAll(async () => {
  [su, shopAdmin] = await Promise.all([superAdminToken(), tokenFor('shop_admin', TENANT.A)]);
});

describe('Plans (admin)', () => {
  it('lists the seeded plans', async () => {
    const res = await request(app).get('/admin/v1/plans').set('Authorization', `Bearer ${su}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((p) => p.name === 'Basic')).toBe(true);
  });

  it('creates, updates, and deactivates a plan', async () => {
    const created = await request(app)
      .post('/admin/v1/plans')
      .set('Authorization', `Bearer ${su}`)
      .send(planBody());
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const updated = await request(app)
      .patch(`/admin/v1/plans/${id}`)
      .set('Authorization', `Bearer ${su}`)
      .send({ price_tzs: 60000 });
    expect(updated.status).toBe(200);
    expect(Number(updated.body.data.price_tzs)).toBe(60000);

    const removed = await request(app)
      .delete(`/admin/v1/plans/${id}`)
      .set('Authorization', `Bearer ${su}`);
    expect(removed.status).toBe(204);

    const list = await request(app).get('/admin/v1/plans').set('Authorization', `Bearer ${su}`);
    expect(list.body.data.find((p) => p.id === id).is_active).toBe(false);
  });

  it('rejects a duplicate plan name with 409', async () => {
    const body = planBody();
    await request(app).post('/admin/v1/plans').set('Authorization', `Bearer ${su}`).send(body);
    const dup = await request(app)
      .post('/admin/v1/plans')
      .set('Authorization', `Bearer ${su}`)
      .send(body);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('PLAN_NAME_TAKEN');
  });

  it('validates the body', async () => {
    const res = await request(app)
      .post('/admin/v1/plans')
      .set('Authorization', `Bearer ${su}`)
      .send({ name: 'X' });
    expect(res.status).toBe(422);
  });

  it('forbids a shop_admin from managing plans', async () => {
    const res = await request(app)
      .get('/admin/v1/plans')
      .set('Authorization', `Bearer ${shopAdmin}`);
    expect(res.status).toBe(403);
  });
});

describe('Billing events (admin)', () => {
  let tenantId;

  beforeAll(async () => {
    const plan = await request(app).get('/admin/v1/plans').set('Authorization', `Bearer ${su}`);
    const basic = plan.body.data.find((p) => p.name === 'Basic');
    const sfx = randomUUID().slice(0, 8);
    const created = await request(app)
      .post('/admin/v1/tenants')
      .set('Authorization', `Bearer ${su}`)
      .send({
        name: 'Bill',
        slug: `bill-${sfx}`,
        owner_email: `o-${sfx}@dsm.test`,
        plan_id: basic.id,
      });
    tenantId = created.body.data.tenant.id;
  });

  it('records and lists a billing event', async () => {
    const rec = await request(app)
      .post(`/admin/v1/tenants/${tenantId}/billing`)
      .set('Authorization', `Bearer ${su}`)
      .send({ type: 'payment_received', amount_tzs: 30000, method: 'mpesa', reference: 'R1' });
    expect(rec.status).toBe(201);
    expect(rec.body.data.type).toBe('payment_received');

    const list = await request(app)
      .get(`/admin/v1/tenants/${tenantId}/billing`)
      .set('Authorization', `Bearer ${su}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((e) => e.reference === 'R1')).toBe(true);
  });

  it('validates the event type', async () => {
    const res = await request(app)
      .post(`/admin/v1/tenants/${tenantId}/billing`)
      .set('Authorization', `Bearer ${su}`)
      .send({ type: 'nonsense' });
    expect(res.status).toBe(422);
  });

  it('404s billing for an unknown tenant', async () => {
    const res = await request(app)
      .get(`/admin/v1/tenants/${randomUUID()}/billing`)
      .set('Authorization', `Bearer ${su}`);
    expect(res.status).toBe(404);
  });
});
