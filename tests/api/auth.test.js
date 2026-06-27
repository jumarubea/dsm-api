import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('Auth — /api/v1/auth', () => {
  describe('POST /api/v1/auth/login', () => {
    it('logs in with valid credentials and sets a refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'shop_admin.shop-a@dsm.test', password: 'test' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe('shop_admin.shop-a@dsm.test');
      expect(res.body.data.user.role).toBe('shop_admin');
      expect(res.body.data.user.password_hash).toBeUndefined();

      const cookies = res.headers['set-cookie'];
      expect(Array.isArray(cookies)).toBe(true);
      const refresh = cookies.find((c) => c.startsWith('refresh_token='));
      expect(refresh).toBeTruthy();
      expect(refresh).toMatch(/HttpOnly/i);
    });

    it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'shop_admin.shop-a@dsm.test', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects an unknown email with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@dsm.test', password: 'test' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('issues a new access token from the refresh cookie', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'shop_admin.shop-a@dsm.test', password: 'test' });
      expect(loginRes.status).toBe(200);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', loginRes.headers['set-cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe('shop_admin.shop-a@dsm.test');
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('rejects a request with no cookie with 401 AUTH_REQUIRED', async () => {
      const res = await request(app).post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 204 and clears the refresh cookie', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });
  });
});
