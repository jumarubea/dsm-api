import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { buildProbeApp } from '../helpers/probeApp.js';
import { tokenFor, TENANT } from '../helpers/auth.js';

const app = buildProbeApp();
const host = (slug) => `${slug}.app.test`;

describe('Idempotency key enforcement', () => {
  let token;

  beforeAll(async () => {
    token = await tokenFor('shop_admin', TENANT.A);
  });

  it('rejects a write missing the Idempotency-Key with 400', async () => {
    const res = await request(app)
      .post('/api/v1/echo')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('rejects a non-UUID Idempotency-Key with 400', async () => {
    const res = await request(app)
      .post('/api/v1/echo')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'not-a-uuid')
      .send({ value: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_INVALID');
  });

  it('accepts a valid UUID Idempotency-Key', async () => {
    const key = randomUUID();
    const res = await request(app)
      .post('/api/v1/echo')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ value: 1 });
    expect(res.status).toBe(201);
    expect(res.body.idempotencyKey).toBe(key);
  });
});
