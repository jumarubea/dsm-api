import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { tokenFor, TENANT } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;

describe('Inventory — /api/v1/inventory', () => {
  let adminToken;
  let storeKeeperToken;
  let salesToken;
  let categoryId;
  let shopBProductId;

  const validProductBody = (overrides = {}) => ({
    name: `Inv-${randomUUID().slice(0, 8)}`,
    sku: `INV-${randomUUID().slice(0, 8)}`,
    category_id: categoryId,
    unit_of_measure: 'kg',
    retail_price: 2500,
    wholesale_price: 2300,
    cost_price: 2000,
    min_stock_level: 5,
    ...overrides,
  });

  // Create a fresh shop-a product so we never mutate the shared seeded data.
  const createProduct = async (overrides = {}) => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Host', host(TENANT.A))
      .set('Idempotency-Key', randomUUID())
      .send(validProductBody(overrides));
    expect(res.status).toBe(201);
    return res.body.data.id;
  };

  beforeAll(async () => {
    adminToken = await tokenFor('shop_admin', TENANT.A);
    storeKeeperToken = await tokenFor('store_keeper', TENANT.A);
    salesToken = await tokenFor('sales_attendant', TENANT.A);

    const cat = await query(
      `SELECT id FROM categories
       WHERE tenant_id = (SELECT id FROM tenants WHERE slug = $1) AND name = 'General'`,
      [TENANT.A]
    );
    categoryId = cat.rows[0].id;

    const prodB = await query(
      `SELECT id FROM products
       WHERE tenant_id = (SELECT id FROM tenants WHERE slug = $1)`,
      [TENANT.B]
    );
    shopBProductId = prodB.rows[0].id;
  });

  describe('POST /api/v1/inventory/stock-in', () => {
    it('records a stock-in and the trigger raises stock_qty', async () => {
      const productId = await createProduct();

      const res = await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: 50 });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('STOCK_IN');

      const detail = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));
      expect(detail.status).toBe(200);
      expect(detail.body.data.stock_qty).toBe(50);
    });

    it('returns 409 IDEMPOTENCY_CONFLICT on a reused Idempotency-Key', async () => {
      const productId = await createProduct();
      const key = randomUUID();

      const first = await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', key)
        .send({ product_id: productId, quantity: 50 });
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', key)
        .send({ product_id: productId, quantity: 50 });
      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    });

    it('returns 400 IDEMPOTENCY_KEY_REQUIRED when the key is missing', async () => {
      const productId = await createProduct();

      const res = await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .send({ product_id: productId, quantity: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    });

    it('denies a sales_attendant with 403 FORBIDDEN', async () => {
      const productId = await createProduct();

      const res = await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${salesToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: 50 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 NOT_FOUND for another tenant product', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: shopBProductId, quantity: 50 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/inventory/adjustment', () => {
    it('records a negative adjustment with a reason', async () => {
      const productId = await createProduct();
      await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: 50 });

      const res = await request(app)
        .post('/api/v1/inventory/adjustment')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: -3, reason: 'breakage' });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('ADJUSTMENT');
    });

    it('rejects a missing reason with 422 VALIDATION_ERROR', async () => {
      const productId = await createProduct();

      const res = await request(app)
        .post('/api/v1/inventory/adjustment')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: -3 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a zero quantity with 422 VALIDATION_ERROR', async () => {
      const productId = await createProduct();

      const res = await request(app)
        .post('/api/v1/inventory/adjustment')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: 0, reason: 'noop' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an adjustment that would drive stock below zero with 422 INSUFFICIENT_STOCK', async () => {
      const productId = await createProduct();
      await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: 50 });

      const res = await request(app)
        .post('/api/v1/inventory/adjustment')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: -9999, reason: 'overshoot' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('GET /api/v1/inventory/low-stock', () => {
    it('lists low-stock products with cost_price for a shop_admin', async () => {
      const productId = await createProduct({ min_stock_level: 5 });
      await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: 3 });

      const res = await request(app)
        .get('/api/v1/inventory/low-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const item = res.body.data.find((p) => p.id === productId);
      expect(item).toBeDefined();
      expect(item).toHaveProperty('cost_price');
    });

    it('strips cost_price for a store_keeper', async () => {
      const productId = await createProduct({ min_stock_level: 5 });
      await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: 3 });

      const res = await request(app)
        .get('/api/v1/inventory/low-stock')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      const item = res.body.data.find((p) => p.id === productId);
      expect(item).toBeDefined();
      expect(item).not.toHaveProperty('cost_price');
    });
  });

  describe('GET /api/v1/inventory/movements', () => {
    it('lists movements and filters by product_id', async () => {
      const productId = await createProduct();
      await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: 50 });

      const all = await request(app)
        .get('/api/v1/inventory/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));
      expect(all.status).toBe(200);
      expect(Array.isArray(all.body.data)).toBe(true);

      const filtered = await request(app)
        .get(`/api/v1/inventory/movements?product_id=${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));
      expect(filtered.status).toBe(200);
      expect(filtered.body.data.length).toBeGreaterThan(0);
      for (const m of filtered.body.data) {
        expect(m.product_id).toBe(productId);
      }
    });
  });

  describe('GET /api/v1/products/:id/movements', () => {
    it('lists a single product movements after a stock-in', async () => {
      const productId = await createProduct();
      await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID())
        .send({ product_id: productId, quantity: 50 });

      const res = await request(app)
        .get(`/api/v1/products/${productId}/movements`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const m of res.body.data) {
        expect(m.product_id).toBe(productId);
      }
    });
  });
});
