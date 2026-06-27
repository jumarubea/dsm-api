import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { tokenFor, TENANT } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;

const validProductBody = (overrides = {}) => ({
  name: `Product-${randomUUID().slice(0, 8)}`,
  sku: `SKU-${randomUUID().slice(0, 8)}`,
  unit_of_measure: 'kg',
  retail_price: 2500,
  wholesale_price: 2300,
  cost_price: 2000,
  ...overrides,
});

describe('Products — /api/v1/products', () => {
  let adminToken;
  let managerToken;
  let salesToken;
  let categoryId;
  let productId;
  let shopBProductId;

  beforeAll(async () => {
    adminToken = await tokenFor('shop_admin', TENANT.A);
    managerToken = await tokenFor('manager', TENANT.A);
    salesToken = await tokenFor('sales_attendant', TENANT.A);

    const cat = await query(
      `SELECT id FROM categories
       WHERE tenant_id = (SELECT id FROM tenants WHERE slug = $1) AND name = 'General'`,
      [TENANT.A]
    );
    categoryId = cat.rows[0].id;

    const prod = await query(
      `SELECT id FROM products
       WHERE tenant_id = (SELECT id FROM tenants WHERE slug = $1)`,
      [TENANT.A]
    );
    productId = prod.rows[0].id;

    const prodB = await query(
      `SELECT id FROM products
       WHERE tenant_id = (SELECT id FROM tenants WHERE slug = $1)`,
      [TENANT.B]
    );
    shopBProductId = prodB.rows[0].id;
  });

  describe('GET /api/v1/products', () => {
    it('exposes cost_price to a shop_admin on every item', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) {
        expect(p).toHaveProperty('cost_price');
      }
    });

    it('strips cost_price for a sales_attendant on every item', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${salesToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) {
        expect(p).not.toHaveProperty('cost_price');
      }
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('returns a product with pricing_rules array and cost_price for shop_admin', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.pricing_rules)).toBe(true);
      expect(res.body.data).toHaveProperty('cost_price');
    });
  });

  describe('cross-tenant isolation', () => {
    it('returns 404 NOT_FOUND when fetching another tenant product by id', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${shopBProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('does not include another tenant product in the list', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      expect(res.body.data.some((p) => p.id === shopBProductId)).toBe(false);
    });
  });

  describe('POST /api/v1/products', () => {
    it('creates a product with cost_price and zero stock for shop_admin', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send(validProductBody({ category_id: categoryId }));

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('cost_price');
      expect(Number(res.body.data.stock_qty)).toBe(0);
    });

    it('rejects a non-existent category with 422 CATEGORY_NOT_FOUND', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send(validProductBody({ category_id: randomUUID() }));

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('rejects a reused sku with 409 SKU_TAKEN', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send(validProductBody({ category_id: categoryId, sku: 'SKU-shop-a' }));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SKU_TAKEN');
    });

    it('denies a sales_attendant with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${salesToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send(validProductBody({ category_id: categoryId }));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects a missing name with 422 VALIDATION_ERROR', async () => {
      const body = validProductBody({ category_id: categoryId });
      delete body.name;
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send(body);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a missing Idempotency-Key with 400 IDEMPOTENCY_KEY_REQUIRED', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .send(validProductBody({ category_id: categoryId }));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    });
  });

  describe('PATCH /api/v1/products/:id', () => {
    it('updates retail_price for a manager', async () => {
      const created = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send(validProductBody({ category_id: categoryId }));
      expect(created.status).toBe(201);

      const res = await request(app)
        .patch(`/api/v1/products/${created.body.data.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ retail_price: 3000 });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.retail_price)).toBe(3000);
    });

    it('denies a sales_attendant with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ retail_price: 3000 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('soft-deletes a product so it disappears from the list', async () => {
      const created = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send(validProductBody({ category_id: categoryId }));
      expect(created.status).toBe(201);
      const id = created.body.data.id;

      const del = await request(app)
        .delete(`/api/v1/products/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID());
      expect(del.status).toBe(204);

      const list = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));
      expect(list.status).toBe(200);
      expect(list.body.data.some((p) => p.id === id)).toBe(false);
    });
  });

  describe('pricing rules', () => {
    it('creates, dedupes, lists and deletes a pricing rule', async () => {
      const created = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send(validProductBody({ category_id: categoryId }));
      expect(created.status).toBe(201);
      const id = created.body.data.id;

      const rule = await request(app)
        .post(`/api/v1/products/${id}/pricing-rules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ min_qty: 10, price_type: 'wholesale' });
      expect(rule.status).toBe(201);
      const ruleId = rule.body.data.id;

      const dup = await request(app)
        .post(`/api/v1/products/${id}/pricing-rules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ min_qty: 10, price_type: 'wholesale' });
      expect(dup.status).toBe(409);
      expect(dup.body.error.code).toBe('PRICING_RULE_EXISTS');

      const detail = await request(app)
        .get(`/api/v1/products/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));
      expect(detail.status).toBe(200);
      expect(detail.body.data.pricing_rules.some((r) => r.id === ruleId)).toBe(true);

      const del = await request(app)
        .delete(`/api/v1/products/${id}/pricing-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID());
      expect(del.status).toBe(204);
    });
  });

  describe('plan limit enforcement (checkProductLimit)', () => {
    it('blocks the second product on a max_products=1 plan with 422 PLAN_LIMIT_REACHED', async () => {
      const sfx = randomUUID().slice(0, 8);
      const plan = await query(
        `INSERT INTO subscription_plans
           (name, price_tzs, billing_cycle, trial_days, max_users, max_products)
         VALUES ($1, 0, 'monthly', 14, -1, 1) RETURNING id`,
        [`lim-${sfx}`]
      );
      const ten = await query(
        `INSERT INTO tenants (name, slug, status, owner_email)
         VALUES ('Lim', $1, 'active', $2) RETURNING id`,
        [`lim-${sfx}`, `o-${sfx}@dsm.test`]
      );
      await query(
        `INSERT INTO subscriptions
           (tenant_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', now(), now() + interval '30 days')`,
        [ten.rows[0].id, plan.rows[0].id]
      );
      await query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role)
         VALUES ($1, 'A', $2, 'x', 'shop_admin')`,
        [ten.rows[0].id, `a-${sfx}@dsm.test`]
      );
      const cat = await query(
        `INSERT INTO categories (tenant_id, name) VALUES ($1, 'C') RETURNING id`,
        [ten.rows[0].id]
      );
      const token = await tokenFor('shop_admin', `lim-${sfx}`);
      const slug = `lim-${sfx}`;

      const first = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${token}`)
        .set('Host', host(slug))
        .set('Idempotency-Key', randomUUID())
        .send(validProductBody({ category_id: cat.rows[0].id }));
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${token}`)
        .set('Host', host(slug))
        .set('Idempotency-Key', randomUUID())
        .send(validProductBody({ category_id: cat.rows[0].id }));
      expect(second.status).toBe(422);
      expect(second.body.error.code).toBe('PLAN_LIMIT_REACHED');
    });
  });
});
