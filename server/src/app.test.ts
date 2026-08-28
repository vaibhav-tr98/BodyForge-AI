import request from 'supertest';
import app from './app';
import mongoose from 'mongoose';

describe('Security and Reliability', () => {
  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should include helmet security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('should limit request body size', async () => {
    const largeBody = { data: 'a'.repeat(2 * 1024 * 1024) }; // 2MB
    const res = await request(app).post('/api/auth/login').send(largeBody);
    expect(res.status).toBe(413);
  });

  it('should reject unauthenticated access to AI endpoints with 401', async () => {
    const res = await request(app).get('/api/analytics/daily-summary?date=2024-10-10');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should expose /ready endpoint', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
