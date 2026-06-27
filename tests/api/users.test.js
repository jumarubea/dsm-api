import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { tokenFor, superAdminToken, TENANT } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;

const login = async (email, password = 'test') => {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.data;
};

describe('Users — /api/v1/users', () => {
  let shopAdminToken;
  let shopAdminId;
  let shopAId;

  beforeAll(async () => {
    const data = await login('shop_admin.shop-a@dsm.test');
    shopAdminToken = data.accessToken;
    shopAdminId = data.user.id;

    const { rows } = await query(`SELECT id FROM tenants WHERE slug = $1`, [TENANT.A]);
    shopAId = rows[0].id;
  });

  describe('GET /api/v1/users', () => {
    it('lists tenant users for a shop_admin, all scoped and without password_hash', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const u of res.body.data) {
        expect(u.tenant_id).toBe(shopAId);
        expect(u.password_hash).toBeUndefined();
      }
    });

    it('denies a sales_attendant with 403 FORBIDDEN', async () => {
      const token = await tokenFor('sales_attendant', TENANT.A);
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/users', () => {
    it('creates a user with the requested role and no password_hash', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({
          name: 'New Manager',
          email: `manager-${randomUUID().slice(0, 8)}@dsm.test`,
          password: 'password123',
          role: 'manager',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('manager');
      expect(res.body.data.tenant_id).toBe(shopAId);
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('rejects a duplicate email with 409 EMAIL_TAKEN', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({
          name: 'Dup User',
          email: 'manager.shop-a@dsm.test',
          password: 'password123',
          role: 'manager',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('rejects a missing Idempotency-Key with 400 IDEMPOTENCY_KEY_REQUIRED', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A))
        .send({
          name: 'No Key',
          email: `nokey-${randomUUID().slice(0, 8)}@dsm.test`,
          password: 'password123',
          role: 'manager',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    });

    it('rejects a short password with 422 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({
          name: 'Short Pass',
          email: `short-${randomUUID().slice(0, 8)}@dsm.test`,
          password: 'short',
          role: 'manager',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('updates a user name', async () => {
      const created = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({
          name: 'Patch Target',
          email: `patch-${randomUUID().slice(0, 8)}@dsm.test`,
          password: 'password123',
          role: 'sales_attendant',
        });
      expect(created.status).toBe(201);

      const res = await request(app)
        .patch(`/api/v1/users/${created.body.data.id}`)
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ name: 'Renamed User' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed User');
    });

    it('rejects changing your own role with 422 CANNOT_CHANGE_OWN_ROLE', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${shopAdminId}`)
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ role: 'manager' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('CANNOT_CHANGE_OWN_ROLE');
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('deactivates a user, returning is_active false', async () => {
      const created = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({
          name: 'Delete Target',
          email: `del-${randomUUID().slice(0, 8)}@dsm.test`,
          password: 'password123',
          role: 'store_keeper',
        });
      expect(created.status).toBe(201);

      const res = await request(app)
        .delete(`/api/v1/users/${created.body.data.id}`)
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID());

      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(false);
    });

    it('rejects deactivating yourself with 422 CANNOT_DEACTIVATE_SELF', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${shopAdminId}`)
        .set('Authorization', `Bearer ${shopAdminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID());

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('CANNOT_DEACTIVATE_SELF');
    });
  });

  describe('PATCH /api/v1/users/me/language', () => {
    it('lets any role update their own language preference', async () => {
      const token = await tokenFor('sales_attendant', TENANT.A);
      const res = await request(app)
        .patch('/api/v1/users/me/language')
        .set('Authorization', `Bearer ${token}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ language_preference: 'sw' });

      expect(res.status).toBe(200);
      expect(res.body.data.language_preference).toBe('sw');
    });
  });

  describe('plan limit enforcement', () => {
    it('rejects creating a user beyond the Basic plan max_users with 422 PLAN_LIMIT_REACHED', async () => {
      const superAdmin = await superAdminToken();
      const { rows } = await query(
        `SELECT id FROM subscription_plans WHERE name = 'Basic' LIMIT 1`
      );
      const basicId = rows[0].id;

      const sfx = randomUUID().slice(0, 8);
      const newSlug = `lim-${sfx}`;
      const created = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${superAdmin}`)
        .send({
          name: `Limited ${sfx}`,
          slug: newSlug,
          owner_email: `o-${sfx}@dsm.test`,
          plan_id: basicId,
        });
      expect(created.status).toBe(201);

      const token = await tokenFor('shop_admin', newSlug);

      // Owner is user #1. #2 and #3 succeed (max_users = 3), #4 is rejected.
      const makeUser = () =>
        request(app)
          .post('/api/v1/users')
          .set('Authorization', `Bearer ${token}`)
          .set('Host', host(newSlug))
          .set('Idempotency-Key', randomUUID())
          .send({
            name: `Member ${randomUUID().slice(0, 6)}`,
            email: `m-${randomUUID().slice(0, 8)}@dsm.test`,
            password: 'password123',
            role: 'sales_attendant',
          });

      const second = await makeUser();
      expect(second.status).toBe(201);

      const third = await makeUser();
      expect(third.status).toBe(201);

      const fourth = await makeUser();
      expect(fourth.status).toBe(422);
      expect(fourth.body.error.code).toBe('PLAN_LIMIT_REACHED');
    });
  });
});
