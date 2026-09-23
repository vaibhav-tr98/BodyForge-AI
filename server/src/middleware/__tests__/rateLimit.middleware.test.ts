import express, { Request, Response } from 'express';
import request from 'supertest';
import {
  apiLimiter,
  authLimiter,
  readLimiter,
  mutationLimiter,
  apiMethodLimiter
} from '../rateLimit.middleware';

describe('Rate Limiter Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.set('trust proxy', 1);

    // Mock authentication middleware
    const mockAuth = (req: Request, res: Response, next: express.NextFunction) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer user-')) {
        req.authenticatedUserId = authHeader.split('-')[1];
      }
      next();
    };

    app.use(express.json());

    // Apply global API limiter
    app.use('/api', apiLimiter);

    // Mock Auth Routes
    app.post('/api/auth/login', authLimiter, (req, res) => {
      res.json({ success: true });
    });

    // Mock Protected Routes
    const protectedRouter = express.Router();
    protectedRouter.use(mockAuth);
    protectedRouter.use(apiMethodLimiter);
    
    protectedRouter.get('/data', (req, res) => res.json({ success: true }));
    protectedRouter.post('/data', (req, res) => res.json({ success: true }));
    protectedRouter.options('/data', (req, res) => res.status(204).end());

    app.use('/api/protected', protectedRouter);
  });

  describe('authLimiter', () => {
    it('should limit auth attempts correctly', async () => {
      // Limit is 20
      for (let i = 0; i < 20; i++) {
        await request(app).post('/api/auth/login').expect(200);
      }
      const res = await request(app).post('/api/auth/login');
      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('ERR_RATE_LIMITED');
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('readLimiter', () => {
    it('authenticated users have independent buckets', async () => {
      // User A makes 120 GET requests
      for (let i = 0; i < 120; i++) {
        await request(app).get('/api/protected/data').set('Authorization', 'Bearer user-A').expect(200);
      }
      
      // User A should be rate limited on 121st
      await request(app).get('/api/protected/data').set('Authorization', 'Bearer user-A').expect(429);

      // User B should NOT be rate limited
      await request(app).get('/api/protected/data').set('Authorization', 'Bearer user-B').expect(200);
    });

    it('unauthenticated requests use IP-based fallback', async () => {
      for (let i = 0; i < 120; i++) {
        await request(app).get('/api/protected/data').set('X-Forwarded-For', '1.2.3.4').expect(200);
      }
      
      const res = await request(app).get('/api/protected/data').set('X-Forwarded-For', '1.2.3.4');
      expect(res.status).toBe(429);
      expect(res.body.code).toBe('ERR_RATE_LIMITED');

      // Different IP should succeed
      await request(app).get('/api/protected/data').set('X-Forwarded-For', '5.6.7.8').expect(200);
    });
    
    it('OPTIONS requests are not counted', async () => {
      for (let i = 0; i < 150; i++) {
        await request(app).options('/api/protected/data').expect(204);
      }
      // Should still be able to make GET requests since OPTIONS don't count
      await request(app).get('/api/protected/data').expect(200);
    });
  });

  describe('mutationLimiter', () => {
    it('should have a stricter limit for POST requests', async () => {
      // User C makes 30 POST requests
      for (let i = 0; i < 30; i++) {
        await request(app).post('/api/protected/data').set('Authorization', 'Bearer user-C').expect(200);
      }
      
      // User C should be rate limited on 31st
      await request(app).post('/api/protected/data').set('Authorization', 'Bearer user-C').expect(429);

      // User C can still make GET requests!
      await request(app).get('/api/protected/data').set('Authorization', 'Bearer user-C').expect(200);
    });
  });
});
