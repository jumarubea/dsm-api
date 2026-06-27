import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { tokenFor, TENANT } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;
const key = () => randomUUID();

let admin;
let attendant;
let keeper;
let shopBAdmin;

const create = (token, body, slug = TENANT.A) =>
  request(app)
    .post('/api/v1/customers')
    .set('Host', host(slug))
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', key())
    .send(body);

beforeAll(async () => {
  [admin, attendant, keeper, shopBAdmin] = await Promise.all([
    tokenFor('shop_admin', TENANT.A),
    tokenFor('sales_attendant', TENANT.A),
    tokenFor('store_keeper', TENANT.A),
    tokenFor('shop_admin', TENANT.B),
  ]);
});

describe('Customers — write', () => {
  it('creates a customer as attendant', async () => {
    const res = await create(attendant, { name: 'Asha Juma', phone: '0754111222' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Asha Juma');
    expect(res.body.data.phone).toBe('0754111222');
  });

  it('forbids store_keeper from creating customers', async () => {
    const res = await create(keeper, { name: 'X Y' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects an invalid body', async () => {
    const res = await create(attendant, { name: 'A' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires an Idempotency-Key', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`)
      .send({ name: 'No Key' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('updates a customer', async () => {
    const created = await create(admin, { name: 'Before Name' });
    const res = await request(app)
      .patch(`/api/v1/customers/${created.body.data.id}`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`)
      .set('Idempotency-Key', key())
      .send({ name: 'After Name', address: 'Kariakoo' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('After Name');
    expect(res.body.data.address).toBe('Kariakoo');
  });
});

describe('Customers — read', () => {
  it('lists and searches by name or phone', async () => {
    const tag = randomUUID().slice(0, 6);
    await create(attendant, { name: `Searchable ${tag}`, phone: `0769${tag.replace(/\D/g, '0')}` });
    const res = await request(app)
      .get(`/api/v1/customers?search=${tag}`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((c) => c.name.includes(tag))).toBe(true);
  });

  it('returns detail; 404 for unknown and malformed ids', async () => {
    const created = await create(admin, { name: 'Detail Me' });
    const ok = await request(app)
      .get(`/api/v1/customers/${created.body.data.id}`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.id).toBe(created.body.data.id);

    const missing = await request(app)
      .get(`/api/v1/customers/${randomUUID()}`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(missing.status).toBe(404);

    const bad = await request(app)
      .get('/api/v1/customers/abc')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(bad.status).toBe(404);
  });

  it('returns an empty purchase history for a new customer', async () => {
    const created = await create(admin, { name: 'History Me' });
    const res = await request(app)
      .get(`/api/v1/customers/${created.body.data.id}/history`)
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });
});

describe('Customers — isolation', () => {
  it("does not expose another tenant's customer", async () => {
    const created = await create(admin, { name: 'Tenant A Customer' });
    const res = await request(app)
      .get(`/api/v1/customers/${created.body.data.id}`)
      .set('Host', host(TENANT.B))
      .set('Authorization', `Bearer ${shopBAdmin}`);
    expect(res.status).toBe(404);
  });
});
