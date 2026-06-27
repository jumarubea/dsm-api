import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('API docs', () => {
  it('serves the OpenAPI spec', async () => {
    const res = await request(createApp()).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.paths).toHaveProperty('/api/v1/sales');
    expect(res.body.paths['/api/v1/auth/login'].post).toBeDefined();
    // Login body schema is derived from the Zod schema.
    expect(res.body.paths['/api/v1/auth/login'].post.requestBody).toBeDefined();
  });

  it('serves Swagger UI', async () => {
    const res = await request(createApp()).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
