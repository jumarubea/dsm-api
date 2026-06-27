import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { buildProbeApp } from '../helpers/probeApp.js';
import { tokenFor, TENANT } from '../helpers/auth.js';

const app = buildProbeApp();
const host = (slug) => `${slug}.app.test`;

describe('Subscription guard', () => {
  let activeToken;
  let suspendedToken;

  beforeAll(async () => {
    activeToken = await tokenFor('shop_admin', TENANT.A);
    suspendedToken = await tokenFor('shop_admin', TENANT.SUSPENDED);
  });

  it('blocks writes for a suspended tenant with 402', async () => {
    const res = await request(app)
      .post('/api/v1/echo')
      .set('Host', host(TENANT.SUSPENDED))
      .set('Authorization', `Bearer ${suspendedToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ value: 1 });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('SUBSCRIPTION_INACTIVE');
  });

  it('allows reads even for a suspended tenant', async () => {
    const res = await request(app)
      .get('/api/v1/whoami')
      .set('Host', host(TENANT.SUSPENDED))
      .set('Authorization', `Bearer ${suspendedToken}`);
    expect(res.status).toBe(200);
  });

  it('allows writes for an active tenant', async () => {
    const res = await request(app)
      .post('/api/v1/echo')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${activeToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ value: 1 });
    expect(res.status).toBe(201);
  });
});
