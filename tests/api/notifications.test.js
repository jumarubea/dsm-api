import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { tokenFor, TENANT } from '../helpers/auth.js';

const app = createApp();
const host = (slug) => `${slug}.app.test`;

describe('Notifications — /api/v1/notifications', () => {
  let adminToken;
  let storeKeeperToken;
  let salesToken;
  let categoryId;

  const validProductBody = (overrides = {}) => ({
    name: `Notif-${randomUUID().slice(0, 8)}`,
    sku: `NTF-${randomUUID().slice(0, 8)}`,
    category_id: categoryId,
    unit_of_measure: 'kg',
    retail_price: 2500,
    wholesale_price: 2300,
    cost_price: 2000,
    min_stock_level: 5,
    ...overrides,
  });

  // Create a fresh shop-a product and drive it below min to raise a LOW_STOCK
  // notification, never touching the shared seeded data.
  const createLowStockProduct = async () => {
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Host', host(TENANT.A))
      .set('Idempotency-Key', randomUUID())
      .send(validProductBody());
    expect(created.status).toBe(201);
    const productId = created.body.data.id;

    const stockIn = await request(app)
      .post('/api/v1/inventory/stock-in')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .set('Host', host(TENANT.A))
      .set('Idempotency-Key', randomUUID())
      .send({ product_id: productId, quantity: 3 });
    expect(stockIn.status).toBe(201);
    return productId;
  };

  const lowStockNotificationId = async (productId) => {
    const { rows } = await query(
      `SELECT id FROM notifications WHERE product_id = $1 AND type = 'LOW_STOCK'`,
      [productId]
    );
    return rows[0]?.id;
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
  });

  describe('GET /api/v1/notifications', () => {
    it('includes a LOW_STOCK notification for a store_keeper', async () => {
      const productId = await createLowStockProduct();

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const item = res.body.data.find((n) => n.type === 'LOW_STOCK' && n.product_id === productId);
      expect(item).toBeDefined();
    });

    it('hides the LOW_STOCK notification from a sales_attendant', async () => {
      const productId = await createLowStockProduct();

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${salesToken}`)
        .set('Host', host(TENANT.A));

      expect(res.status).toBe(200);
      expect(res.body.data.some((n) => n.product_id === productId)).toBe(false);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('marks a notification read so it drops out of the list', async () => {
      const productId = await createLowStockProduct();
      const notifId = await lowStockNotificationId(productId);
      expect(notifId).toBeDefined();

      const patch = await request(app)
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID());
      expect(patch.status).toBe(204);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A));
      expect(res.status).toBe(200);
      expect(res.body.data.some((n) => n.id === notifId)).toBe(false);
    });

    it('returns 404 NOT_FOUND for a random UUID', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${randomUUID()}/read`)
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID());

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 NOT_FOUND for a non-UUID id', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/abc/read')
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .set('Host', host(TENANT.A))
        .set('Idempotency-Key', randomUUID());

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
