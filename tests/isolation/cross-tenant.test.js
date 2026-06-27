import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { buildProbeApp } from '../helpers/probeApp.js';
import { tokenFor, TENANT } from '../helpers/auth.js';

const app = buildProbeApp();
const host = (slug) => `${slug}.app.test`;

describe('Cross-tenant isolation', () => {
  let tokenA;

  beforeAll(async () => {
    tokenA = await tokenFor('shop_admin', TENANT.A);
  });

  it('resolves the caller to their own tenant', async () => {
    const res = await request(app)
      .get('/api/v1/whoami')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.tenant_slug).toBe(TENANT.A);
  });

  it('rejects a Tenant A token replayed against Tenant B with 404', async () => {
    const res = await request(app)
      .get('/api/v1/whoami')
      .set('Host', host(TENANT.B))
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.tenant_id).toBeUndefined();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/whoami').set('Host', host(TENANT.A));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 401 for a malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/whoami')
      .set('Host', host(TENANT.A))
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID');
  });
});
