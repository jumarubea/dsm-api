import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { tokenFor, TENANT } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;

describe('Categories — /api/v1/categories', () => {
  let adminToken;
  let salesToken;
  let generalId;

  beforeAll(async () => {
    adminToken = await tokenFor('shop_admin', TENANT.A);
    salesToken = await tokenFor('sales_attendant', TENANT.A);

    const { rows } = await query(
      `SELECT id FROM categories
       WHERE tenant_id = (SELECT id FROM tenants WHERE slug = $1) AND name = 'General'`,
      [TENANT.A]
    );
    generalId = rows[0].id;
  });

  describe('GET /api/v1/categories', () => {
    it('lists categories for a sales_attendant, including the seeded General', async () => {
      const res = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${salesToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((c) => c.name === 'General')).toBe(true);
    });
  });

  describe('POST /api/v1/categories', () => {
    it('creates a category for a shop_admin', async () => {
      const name = `Vinywaji-${randomUUID().slice(0, 8)}`;
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ name });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(name);
    });

    it('rejects a duplicate name with 409 CATEGORY_NAME_TAKEN', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ name: 'General' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CATEGORY_NAME_TAKEN');
    });

    it('rejects a missing name with 422 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('denies a sales_attendant with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${salesToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ name: `Denied-${randomUUID().slice(0, 8)}` });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects a missing Idempotency-Key with 400 IDEMPOTENCY_KEY_REQUIRED', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .send({ name: `NoKey-${randomUUID().slice(0, 8)}` });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    });
  });

  describe('PATCH /api/v1/categories/:id', () => {
    it('renames an existing category', async () => {
      const created = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ name: `Rename-${randomUUID().slice(0, 8)}` });
      expect(created.status).toBe(201);

      const newName = `Renamed-${randomUUID().slice(0, 8)}`;
      const res = await request(app)
        .patch(`/api/v1/categories/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ name: newName });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(newName);
    });

    it('returns 404 for a non-UUID id', async () => {
      const res = await request(app)
        .patch('/api/v1/categories/abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ name: 'Whatever' });

      expect(res.status).toBe(404);
    });

    it('returns 404 NOT_FOUND for a random UUID', async () => {
      const res = await request(app)
        .patch(`/api/v1/categories/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ name: 'Whatever' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('rejects deleting a category that has products with 409 CATEGORY_HAS_PRODUCTS', async () => {
      const res = await request(app)
        .delete(`/api/v1/categories/${generalId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID());

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CATEGORY_HAS_PRODUCTS');
    });

    it('deletes an empty category with 204', async () => {
      const created = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ name: `Empty-${randomUUID().slice(0, 8)}` });
      expect(created.status).toBe(201);

      const res = await request(app)
        .delete(`/api/v1/categories/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID());

      expect(res.status).toBe(204);
    });
  });
});
