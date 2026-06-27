import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { verifyAccessToken } from '../../src/utils/jwt.js';
import { tokenFor, superAdminToken, TENANT } from '../helpers/auth.js';

const app = createApp();
const RANDOM_UUID = '00000000-0000-4000-8000-000000000000';

const newTenantBody = (planId, overrides = {}) => {
  const sfx = randomUUID().slice(0, 8);
  return {
    name: `Tenant ${sfx}`,
    slug: `t-${sfx}`,
    owner_email: `owner-${sfx}@example.test`,
    plan_id: planId,
    ...overrides,
  };
};

describe('Super Admin tenant management', () => {
  let token;
  let planId;
  let fixtureId;

  beforeAll(async () => {
    token = await superAdminToken();

    const { rows } = await query(`SELECT id FROM subscription_plans WHERE name = 'Basic' LIMIT 1`);
    planId = rows[0].id;

    const res = await request(app)
      .post('/admin/v1/tenants')
      .set('Authorization', `Bearer ${token}`)
      .send(newTenantBody(planId));
    expect(res.status).toBe(201);
    fixtureId = res.body.data.tenant.id;
  });

  describe('POST /admin/v1/tenants', () => {
    it('creates a tenant, owner, trial subscription and onboarding email', async () => {
      const body = newTenantBody(planId);
      const res = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

      expect(res.status).toBe(201);
      const { tenant, owner, subscription, onboarding_email } = res.body.data;

      expect(tenant.slug).toBe(body.slug);
      expect(tenant.status).toBe('trialing');
      expect(owner.role).toBe('shop_admin');
      expect(owner.email).toBe(body.owner_email);
      expect(subscription.status).toBe('trialing');
      expect(onboarding_email.to).toBe(body.owner_email);
      expect(onboarding_email.delivered).toBe(false);

      // DB side-effects.
      const tRows = (await query('SELECT id, status FROM tenants WHERE id = $1', [tenant.id])).rows;
      expect(tRows).toHaveLength(1);
      expect(tRows[0].status).toBe('trialing');

      const sRows = (
        await query('SELECT status FROM subscriptions WHERE tenant_id = $1', [tenant.id])
      ).rows;
      expect(sRows).toHaveLength(1);
      expect(sRows[0].status).toBe('trialing');

      const uRows = (
        await query('SELECT role FROM users WHERE email = $1 AND tenant_id = $2', [
          body.owner_email,
          tenant.id,
        ])
      ).rows;
      expect(uRows).toHaveLength(1);
      expect(uRows[0].role).toBe('shop_admin');

      const aRows = (await query('SELECT action FROM audit_log WHERE entity_id = $1', [tenant.id]))
        .rows;
      expect(aRows.map((r) => r.action)).toContain('TENANT_CREATED');
    });

    it('rejects a duplicate slug with 409 SLUG_TAKEN', async () => {
      const body = newTenantBody(planId);
      const first = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(body);
      expect(first.status).toBe(201);

      const dup = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(newTenantBody(planId, { slug: body.slug }));

      expect(dup.status).toBe(409);
      expect(dup.body.error.code).toBe('SLUG_TAKEN');
    });

    it('rejects a duplicate owner_email with 409 EMAIL_TAKEN', async () => {
      const res = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(newTenantBody(planId, { owner_email: 'shop_admin.shop-a@dsm.test' }));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('rejects a missing name with 422 VALIDATION_ERROR', async () => {
      const body = newTenantBody(planId);
      delete body.name;
      const res = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a non-existent plan_id with 422 PLAN_NOT_FOUND', async () => {
      const res = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(newTenantBody(RANDOM_UUID));

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('PLAN_NOT_FOUND');
    });
  });

  describe('GET /admin/v1/tenants', () => {
    it('lists tenants including the fixture tenant', async () => {
      const res = await request(app)
        .get('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.map((t) => t.id)).toContain(fixtureId);
    });
  });

  describe('GET /admin/v1/tenants/:id', () => {
    it('returns tenant detail with a billing_events array', async () => {
      const res = await request(app)
        .get(`/admin/v1/tenants/${fixtureId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(fixtureId);
      expect(Array.isArray(res.body.data.billing_events)).toBe(true);
    });

    it('returns 404 NOT_FOUND for a non-UUID id', async () => {
      const res = await request(app)
        .get('/admin/v1/tenants/abc')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 NOT_FOUND for a random UUID', async () => {
      const res = await request(app)
        .get(`/admin/v1/tenants/${RANDOM_UUID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /admin/v1/tenants/:id', () => {
    it('updates the tenant name', async () => {
      const create = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(newTenantBody(planId));
      const id = create.body.data.tenant.id;

      const res = await request(app)
        .patch(`/admin/v1/tenants/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed Shop' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed Shop');
    });

    it('updates status to suspended and syncs the subscription', async () => {
      const create = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(newTenantBody(planId));
      const id = create.body.data.tenant.id;

      const res = await request(app)
        .patch(`/admin/v1/tenants/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'suspended' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('suspended');

      const sRows = (await query('SELECT status FROM subscriptions WHERE tenant_id = $1', [id]))
        .rows;
      expect(sRows[0].status).toBe('suspended');
    });
  });

  describe('suspend / activate', () => {
    it('suspends then activates a tenant, syncing the subscription', async () => {
      const create = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(newTenantBody(planId));
      const id = create.body.data.tenant.id;

      const suspend = await request(app)
        .post(`/admin/v1/tenants/${id}/suspend`)
        .set('Authorization', `Bearer ${token}`);
      expect(suspend.status).toBe(200);
      expect(suspend.body.data.status).toBe('suspended');

      const suspendedSub = (
        await query('SELECT status FROM subscriptions WHERE tenant_id = $1', [id])
      ).rows;
      expect(suspendedSub[0].status).toBe('suspended');

      const activate = await request(app)
        .post(`/admin/v1/tenants/${id}/activate`)
        .set('Authorization', `Bearer ${token}`);
      expect(activate.status).toBe(200);
      expect(activate.body.data.status).toBe('active');

      const activeSub = (await query('SELECT status FROM subscriptions WHERE tenant_id = $1', [id]))
        .rows;
      expect(activeSub[0].status).toBe('active');
    });
  });

  describe('DELETE /admin/v1/tenants/:id', () => {
    it('soft-deletes a tenant; detail then shows status cancelled', async () => {
      const create = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(newTenantBody(planId));
      const id = create.body.data.tenant.id;

      const del = await request(app)
        .delete(`/admin/v1/tenants/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(del.status).toBe(204);
      expect(del.body).toEqual({});

      const detail = await request(app)
        .get(`/admin/v1/tenants/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(detail.status).toBe(200);
      expect(detail.body.data.status).toBe('cancelled');
    });
  });

  describe('POST /admin/v1/tenants/:id/impersonate', () => {
    it('issues a scoped shop_admin token and audits the action', async () => {
      const create = await request(app)
        .post('/admin/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send(newTenantBody(planId));
      const id = create.body.data.tenant.id;
      const slug = create.body.data.tenant.slug;

      const res = await request(app)
        .post(`/admin/v1/tenants/${id}/impersonate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.expires_in).toBe('2h');
      expect(res.body.data.tenant).toEqual({ id, slug });

      const decoded = verifyAccessToken(res.body.data.token);
      expect(decoded.role).toBe('shop_admin');
      expect(decoded.tenant_id).toBe(id);
      expect(decoded.impersonated_by).toBeTruthy();

      const aRows = (await query('SELECT action FROM audit_log WHERE entity_id = $1', [id])).rows;
      expect(aRows.map((r) => r.action)).toContain('IMPERSONATION_STARTED');
    });
  });

  describe('RBAC', () => {
    it('denies a shop_admin token with 403 FORBIDDEN', async () => {
      const shopToken = await tokenFor('shop_admin', TENANT.A);
      const res = await request(app)
        .get('/admin/v1/tenants')
        .set('Authorization', `Bearer ${shopToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('denies an unauthenticated request with 401 AUTH_REQUIRED', async () => {
      const res = await request(app).get('/admin/v1/tenants');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });
  });
});
