import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { buildProbeApp } from '../helpers/probeApp.js';
import { tokenFor, superAdminToken, TENANT } from '../helpers/auth.js';

const app = buildProbeApp();
const host = (slug) => `${slug}.app.test`;

describe('Role guard', () => {
  let attendant;
  let admin;
  let superAdmin;

  beforeAll(async () => {
    attendant = await tokenFor('sales_attendant', TENANT.A);
    admin = await tokenFor('shop_admin', TENANT.A);
    superAdmin = await superAdminToken();
  });

  it('denies a privileged shop route to sales_attendant with 403', async () => {
    const res = await request(app)
      .get('/api/v1/profit')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${attendant}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows a privileged shop route for shop_admin', async () => {
    const res = await request(app)
      .get('/api/v1/profit')
      .set('Host', host(TENANT.A))
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
  });

  it('allows the admin platform route for super_admin', async () => {
    const res = await request(app).get('/admin/v1/').set('Authorization', `Bearer ${superAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('super_admin');
  });

  it('denies the admin platform route to a shop_admin with 403', async () => {
    const res = await request(app).get('/admin/v1/').set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
