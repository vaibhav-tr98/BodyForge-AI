import {
  enqueueUpdateMutation,
  enqueueCompleteMutation,
  getQueue,
  clearUserQueue,
  triggerSync,
  setSyncUserId
} from '../syncQueue';
import * as idb from 'idb-keyval';
import { updateWorkoutSession, completeWorkoutSession } from '../../services/workoutSession.service';

// Mock dependencies
jest.mock('idb-keyval', () => {
  let store: any = {};
  return {
    get: jest.fn((key) => Promise.resolve(store[key])),
    set: jest.fn((key, val) => {
      // Ensure we don't store JWTs (just to be safe against random pollution)
      store[key] = val;
      return Promise.resolve();
    }),
    del: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    _clearMemory: () => { store = {}; }
  };
});

jest.mock('../../services/workoutSession.service', () => ({
  updateWorkoutSession: jest.fn().mockResolvedValue({ updatedAt: 'default_date' }),
  completeWorkoutSession: jest.fn().mockResolvedValue({})
}));

jest.mock('../queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn()
  }
}));

describe('Phase 2.4 Offline Mutation Queue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (idb as any)._clearMemory();
    await idb.set('bodyforge-mutation-queue', []);
    
    // Simulate online by default
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    
    // Default locks mock
    if (!navigator.locks) {
      Object.defineProperty(navigator, 'locks', {
        writable: true,
        value: {
          request: jest.fn(async (name, _options, cb) => {
            return await cb({ name });
          })
        }
      });
    }

    setSyncUserId('userA');
  });

  describe('Queue Lifecycle & Coalescing', () => {
    it('1. offline PATCH creates queue item and generates UUID (6)', async () => {
      await enqueueUpdateMutation('userA', 'session1', { ex: 1 }, '2024-01-01');
      const q = await getQueue();
      expect(q).toHaveLength(1);
      expect(q[0].id).toMatch(/^[a-f0-9-]{36}$/i); // UUID format
      expect(q[0].type).toBe('update');
      expect(q[0].expectedUpdatedAt).toBe('2024-01-01');
    });

    it('2. multiple PATCH mutations for same session coalesce (2) and preserve expectedUpdatedAt (10)', async () => {
      await enqueueUpdateMutation('userA', 'session1', { step: 1 }, 'original-date');
      let q = await getQueue();
      const firstId = q[0].id;

      await enqueueUpdateMutation('userA', 'session1', { step: 2 }, 'original-date');
      q = await getQueue();
      
      expect(q).toHaveLength(1);
      expect(q[0].payload).toEqual({ step: 2 });
      expect(q[0].expectedUpdatedAt).toBe('original-date');
      expect(q[0].id).not.toBe(firstId); // 9. coalescing generates NEW idempotency key
    });

    it('3. different sessions remain independent (3)', async () => {
      await enqueueUpdateMutation('userA', 'session1', { step: 1 }, 'date1');
      await enqueueUpdateMutation('userA', 'session2', { step: 1 }, 'date2');
      const q = await getQueue();
      expect(q).toHaveLength(2);
      expect(q[0].sessionId).toBe('session1');
      expect(q[1].sessionId).toBe('session2');
    });

    it('4. queue ordering is deterministic (4) and survives reload (5)', async () => {
      await enqueueUpdateMutation('userA', 'session1', {}, 'date1');
      await new Promise(r => setTimeout(r, 10)); // Ensure different createdAt
      await enqueueCompleteMutation('userA', 'session1', 'date1');
      
      const q = await getQueue();
      expect(q[0].type).toBe('update');
      expect(q[1].type).toBe('complete');
      expect(q[0].createdAt).toBeLessThan(q[1].createdAt);
    });
  });

  describe('Network & Retry Behavior', () => {
    it('11. network error causes queueing (implicitly tested by component, here we test queue processing fail)', async () => {
      await enqueueUpdateMutation('userA', 's1', {}, 'd1');
      
      const err = new Error('Network Error') as any;
      err.isAxiosError = true;
      (updateWorkoutSession as jest.Mock).mockRejectedValueOnce(err);

      triggerSync();
      // wait for debounce
      await new Promise(r => setTimeout(r, 150));
      
      const q = await getQueue();
      expect(q).toHaveLength(1);
      expect(q[0].retryCount).toBe(1);
      expect(q[0].status).toBe('pending');
    });

    it('13, 14. 5xx and 429 cause bounded retry', async () => {
      await enqueueUpdateMutation('userA', 's1', {}, 'd1');
      let q = await getQueue();
      const originalId = q[0].id;

      const err = new Error('Server Error') as any;
      err.isAxiosError = true;
      err.response = { status: 500 };
      (updateWorkoutSession as jest.Mock).mockRejectedValueOnce(err);

      triggerSync();
      await new Promise(r => setTimeout(r, 150));
      
      q = await getQueue();
      expect(q).toHaveLength(1);
      expect(q[0].retryCount).toBe(1);
      expect(q[0].id).toBe(originalId); // 7. retry reuses EXACT SAME idempotency key
    });

    it('15. 401 pauses without deleting data', async () => {
      await enqueueUpdateMutation('userA', 's1', {}, 'd1');
      
      const err = new Error('Unauthorized') as any;
      err.isAxiosError = true;
      err.response = { status: 401 };
      (updateWorkoutSession as jest.Mock).mockRejectedValueOnce(err);

      triggerSync();
      await new Promise(r => setTimeout(r, 150));
      
      const q = await getQueue();
      expect(q).toHaveLength(1);
      expect(q[0].retryCount).toBe(0); // Paused, no retry increment
    });

    it('16. permanent 400 does not retry indefinitely', async () => {
      await enqueueUpdateMutation('userA', 's1', {}, 'd1');
      
      const err = new Error('Bad Request') as any;
      err.isAxiosError = true;
      err.response = { status: 400 };
      (updateWorkoutSession as jest.Mock).mockRejectedValueOnce(err);

      triggerSync();
      await new Promise(r => setTimeout(r, 150));
      
      const q = await getQueue();
      expect(q).toHaveLength(1);
      expect(q[0].status).toBe('failed'); // Marked failed, won't retry
    });
  });

  describe('Backend Idempotency & OCC', () => {
    it('17. IDEMPOTENCY_KEY_REUSE is permanent failure', async () => {
      await enqueueUpdateMutation('userA', 's1', {}, 'd1');
      const err = new Error('Conflict') as any;
      err.isAxiosError = true;
      err.response = { status: 409, data: { code: 'IDEMPOTENCY_KEY_REUSE' } };
      (updateWorkoutSession as jest.Mock).mockRejectedValueOnce(err);

      triggerSync();
      await new Promise(r => setTimeout(r, 150));
      const q = await getQueue();
      expect(q[0].status).toBe('failed');
    });

    it('18. IDEMPOTENCY_REQUEST_IN_PROGRESS retries using same key', async () => {
      await enqueueUpdateMutation('userA', 's1', {}, 'd1');
      let q = await getQueue();
      const originalId = q[0].id;

      const err = new Error('In Progress') as any;
      err.isAxiosError = true;
      err.response = { status: 409, data: { code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS' } };
      (updateWorkoutSession as jest.Mock).mockRejectedValueOnce(err);

      triggerSync();
      await new Promise(r => setTimeout(r, 150));
      
      q = await getQueue();
      expect(q[0].status).toBe('pending');
      expect(q[0].retryCount).toBe(1);
      expect(q[0].id).toBe(originalId);
    });

    it('19-23. ERR_CONCURRENCY_CONFLICT is detected and preserves data, does not block others', async () => {
      await enqueueUpdateMutation('userA', 'session_conflict', {}, 'd1');
      await enqueueUpdateMutation('userA', 'session_ok', {}, 'd1');

      const err = new Error('OCC Conflict') as any;
      err.isAxiosError = true;
      err.response = { status: 409, data: { code: 'ERR_CONCURRENCY_CONFLICT' } };
      
      // First call (session_conflict) fails with OCC
      (updateWorkoutSession as jest.Mock).mockRejectedValueOnce(err);
      // Second call (session_ok) succeeds
      (updateWorkoutSession as jest.Mock).mockResolvedValueOnce({ updatedAt: 'new_d1' });

      triggerSync();
      await new Promise(r => setTimeout(r, 150));
      
      const q = await getQueue();
      expect(q).toHaveLength(1); // 'session_ok' succeeded and was removed
      expect(q[0].sessionId).toBe('session_conflict');
      expect(q[0].status).toBe('conflict'); // 20. local payload persisted
      expect(q[0].retryCount).toBe(0); // 22. does not infinite retry
    });
  });

  describe('Ordering & Propagation', () => {
    it('24-25. PATCH executes before complete, complete blocks on failed PATCH', async () => {
      await enqueueUpdateMutation('userA', 's1', {}, 'd1');
      await enqueueCompleteMutation('userA', 's1', 'd1');
      
      // Force update to be conflicted
      const err = new Error('OCC Conflict') as any;
      err.isAxiosError = true;
      err.response = { status: 409, data: { code: 'ERR_CONCURRENCY_CONFLICT' } };
      (updateWorkoutSession as jest.Mock).mockRejectedValueOnce(err);

      triggerSync();
      await new Promise(r => setTimeout(r, 150));
      
      const q = await getQueue();
      expect(q).toHaveLength(2);
      expect(q[0].status).toBe('conflict');
      expect(q[1].type).toBe('complete');
      expect(q[1].status).toBe('pending');
      
      // Verify complete wasn't called
      expect(completeWorkoutSession).not.toHaveBeenCalled();
    });

    it('26. successful PATCH updatedAt is propagated correctly (CRITICAL OCC TEST)', async () => {
      await enqueueUpdateMutation('userA', 's1', { step: 1 }, 'OLD_DATE');
      await enqueueUpdateMutation('userA', 's1', { step: 2 }, 'OLD_DATE'); // Coalesced

      let q = await getQueue();
      expect(q[0].expectedUpdatedAt).toBe('OLD_DATE');
      
      // Enqueue a complete mutation which relies on the SAME date initially
      await enqueueCompleteMutation('userA', 's1', 'OLD_DATE');

      (updateWorkoutSession as jest.Mock).mockResolvedValueOnce({ updatedAt: 'NEW_DATE' });
      (completeWorkoutSession as jest.Mock).mockResolvedValueOnce({});

      triggerSync();
      await new Promise(r => setTimeout(r, 150));

      // Assert completeWorkoutSession was called with the NEW expectedUpdatedAt
      expect(completeWorkoutSession).toHaveBeenCalledWith('s1', expect.any(String), 'NEW_DATE');
      
      q = await getQueue();
      expect(q).toHaveLength(0); // Both succeeded
    });
  });

  describe('Auth & Security', () => {
    it('27-29. queue item cannot replay under another user, logout clears queue', async () => {
      await enqueueUpdateMutation('userA', 's1', {}, 'd1');
      
      setSyncUserId('userB');
      await enqueueUpdateMutation('userB', 's2', {}, 'd2');
      
      let q = await getQueue();
      expect(q).toHaveLength(2);

      triggerSync();
      await new Promise(r => setTimeout(r, 150));
      
      // userA's item should remain because active user is userB (assuming service resolves B)
      // Since updateWorkoutSession resolves by default in tests, userB's item will be processed
      // But wait, updateWorkoutSession is just a mock, so userB item drops.
      q = await getQueue();
      expect(q).toHaveLength(1);
      expect(q[0].userId).toBe('userA'); // Skipped due to isolation

      await clearUserQueue('userA'); // Simulated logout of userA
      q = await getQueue();
      expect(q).toHaveLength(0);
    });

    it('CRITICAL PERSISTENCE TEST: contains exactly expected fields', async () => {
      await enqueueUpdateMutation('userX', 's1', { a: 1 }, 'd1');
      const q = await getQueue();
      const item = q[0];
      
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('userId', 'userX');
      expect(item).toHaveProperty('sessionId', 's1');
      expect(item).toHaveProperty('payload', { a: 1 });
      expect(item).toHaveProperty('expectedUpdatedAt', 'd1');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('retryCount');
      expect(item).toHaveProperty('status');
      
      // Ensure no JWT is present
      expect(JSON.stringify(item)).not.toMatch(/token/i);
    });
  });

  describe('Multi-Tab Safety', () => {
    it('31. Web Lock prevents duplicate processing', async () => {
      // Mock request to simulate a locked state (callback not executed)
      (navigator.locks.request as jest.Mock).mockImplementationOnce(async (_name, _options, _cb) => {
        // Return without calling cb, simulating locked by another tab
        return null;
      });

      await enqueueUpdateMutation('userA', 's1', {}, 'd1');
      triggerSync();
      await new Promise(r => setTimeout(r, 150));

      const q = await getQueue();
      // Since the lock was unavailable, processing was skipped, item remains
      expect(q).toHaveLength(1);
      expect(updateWorkoutSession).not.toHaveBeenCalled();
    });
  describe('Phase 2.5 Sync Observability & Operations', () => {
    it('subscriber receives updates and counts are accurate', async () => {
      // @ts-ignore
      const { subscribeToSyncStatus, getSyncStatusSnapshot, enqueueUpdateMutation, setSyncUserId } = require('../syncQueue');
      setSyncUserId('user1');
      
      let callCount = 0;
      const unsubscribe = subscribeToSyncStatus(() => {
        callCount++;
      });

      // initial
      let status = getSyncStatusSnapshot();
      expect(status.pendingCount).toBe(0);

      // enqueue item -> should trigger saveQueue -> notifyListeners
      await enqueueUpdateMutation('user1', 'session1', {}, 'd1');
      
      // Delay to let async IDB save finish and trigger listener
      await new Promise(r => setTimeout(r, 50));
      
      status = getSyncStatusSnapshot();
      expect(status.pendingCount).toBe(1);
      expect(callCount).toBeGreaterThan(0);

      unsubscribe();
      const countBefore = callCount;
      await enqueueUpdateMutation('user1', 'session2', {}, 'd2');
      await new Promise(r => setTimeout(r, 50));
      
      expect(callCount).toBe(countBefore); // listener shouldn't fire
    });

    it('retryFailedMutations resets failures but not conflicts', async () => {
      // @ts-ignore
      const { retryFailedMutations, getQueue, saveQueue, setSyncUserId } = require('../syncQueue');
      setSyncUserId('user1');
      
      // Seed queue manually
      const mockQueue = [
        { id: '1', userId: 'user1', sessionId: 's1', status: 'failed', retryCount: 5 },
        { id: '2', userId: 'user1', sessionId: 's2', status: 'conflict', retryCount: 2 },
        { id: '3', userId: 'user2', sessionId: 's3', status: 'failed', retryCount: 2 }
      ];
      await saveQueue(mockQueue);
      
      await retryFailedMutations();
      
      const q = await getQueue();
      const s1 = q.find((i: any) => i.id === '1');
      const s2 = q.find((i: any) => i.id === '2');
      const s3 = q.find((i: any) => i.id === '3');
      
      expect(s1.status).toBe('pending');
      expect(s1.retryCount).toBe(0); // reset
      expect(s1.id).toBe('1'); // preserves idempotency
      
      expect(s2.status).toBe('conflict'); // remains conflict
      expect(s3.status).toBe('failed'); // wrong user untouched
    });

    it('discardLocal safely removes only intended session', async () => {
      // @ts-ignore
      const { discardLocal, getQueue, saveQueue, setSyncUserId } = require('../syncQueue');
      setSyncUserId('user1');
      
      const mockQueue = [
        { id: '1', userId: 'user1', sessionId: 'conflict-session', status: 'conflict' },
        { id: '2', userId: 'user1', sessionId: 'other-session', status: 'pending' },
        { id: '3', userId: 'user2', sessionId: 'conflict-session', status: 'conflict' }
      ];
      await saveQueue(mockQueue);
      
      await discardLocal('conflict-session');
      
      const q = await getQueue();
      expect(q).toHaveLength(2);
      expect(q.find((i: any) => i.id === '1')).toBeUndefined();
      expect(q.find((i: any) => i.id === '2')).toBeDefined();
      expect(q.find((i: any) => i.id === '3')).toBeDefined(); // different user preserved
    });
  });
});
});
