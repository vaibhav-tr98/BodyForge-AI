import { get, set } from 'idb-keyval';
import { updateWorkoutSession, completeWorkoutSession } from '../services/workoutSession.service';
import { queryClient } from './queryClient';
import { isAxiosError } from 'axios';

const QUEUE_KEY = 'bodyforge-mutation-queue';

export interface QueuedWorkoutMutation {
  id: string; // Used as Idempotency-Key
  userId: string;
  sessionId: string;
  type: "update" | "complete";
  payload?: any;
  expectedUpdatedAt: string;
  createdAt: number;
  retryCount: number;
  status: "pending" | "failed" | "conflict";
  lastError?: string;
}

export async function getQueue(): Promise<QueuedWorkoutMutation[]> {
  const queue = await get<QueuedWorkoutMutation[]>(QUEUE_KEY);
  return queue || [];
}

export async function saveQueue(queue: QueuedWorkoutMutation[]): Promise<void> {
  await set(QUEUE_KEY, queue);
}

export async function clearUserQueue(userId: string): Promise<void> {
  const queue = await getQueue();
  const remaining = queue.filter((item) => item.userId !== userId);
  await saveQueue(remaining);
}

export async function enqueueUpdateMutation(
  userId: string,
  sessionId: string,
  payload: any,
  expectedUpdatedAt: string
): Promise<void> {
  const queue = await getQueue();

  const existingIdx = queue.findIndex(
    (item) => item.sessionId === sessionId && item.type === "update" && item.userId === userId
  );

  if (existingIdx >= 0) {
    // Coalesce!
    // We update the payload, keep the ORIGINAL expectedUpdatedAt from the queue item,
    // and generate a NEW idempotency key because the payload changed.
    queue[existingIdx] = {
      ...queue[existingIdx],
      id: crypto.randomUUID(),
      payload,
      retryCount: 0,
      status: "pending",
      lastError: undefined,
    };
  } else {
    queue.push({
      id: crypto.randomUUID(),
      userId,
      sessionId,
      type: "update",
      payload,
      expectedUpdatedAt,
      createdAt: Date.now(),
      retryCount: 0,
      status: "pending",
    });
  }

  await saveQueue(queue);
  triggerSync();
}

export async function enqueueCompleteMutation(
  userId: string,
  sessionId: string,
  expectedUpdatedAt: string
): Promise<void> {
  const queue = await getQueue();

  // If a complete is already queued, we just ignore/overwrite
  const existingIdx = queue.findIndex(
    (item) => item.sessionId === sessionId && item.type === "complete" && item.userId === userId
  );

  if (existingIdx === -1) {
    queue.push({
      id: crypto.randomUUID(),
      userId,
      sessionId,
      type: "complete",
      expectedUpdatedAt,
      createdAt: Date.now(),
      retryCount: 0,
      status: "pending",
    });
    await saveQueue(queue);
    triggerSync();
  }
}

// ----------------------------------------------------------------------
// Processing logic
// ----------------------------------------------------------------------

let isSyncing = false;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let currentAuthUserId: string | null = null;

export function setSyncUserId(userId: string | null) {
  currentAuthUserId = userId;
  if (userId) triggerSync();
}

export function triggerSync() {
  if (!navigator.onLine) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  
  // Debounce slightly to allow coalescing to finish if multiple sets happen instantly
  syncTimeout = setTimeout(() => {
    processQueueWithLock();
  }, 100);
}

async function processQueueWithLock() {
  if (isSyncing || !navigator.onLine || !currentAuthUserId) return;

  if (navigator.locks) {
    await navigator.locks.request("bodyforge-sync-lock", { ifAvailable: true }, async (lock) => {
      if (!lock) return; // Another tab holds it
      await processQueue();
    });
  } else {
    // Fallback for older browsers
    await processQueue();
  }
}

async function processQueue() {
  isSyncing = true;
  try {
    let queue = await getQueue();
    
    // Sort by createdAt (FIFO)
    queue.sort((a, b) => a.createdAt - b.createdAt);

    let madeProgress = false;

    for (let i = 0; i < queue.length; i++) {
      if (!navigator.onLine) break;

      const item = queue[i];

      // Security Check
      if (item.userId !== currentAuthUserId) {
        continue; // Skip items for other users
      }

      if (item.status === "failed" || item.status === "conflict") {
        continue; // Skip items requiring user intervention
      }

      // If it's a complete mutation, check if there's a pending PATCH for the SAME session BEFORE this item
      if (item.type === "complete") {
        const hasUnresolvedUpdate = queue.some(
          (q) => q.sessionId === item.sessionId && q.type === "update" && q.userId === item.userId && q.createdAt <= item.createdAt
        );
        if (hasUnresolvedUpdate) {
          continue; // Wait for the update to be fully resolved/removed first
        }
      }

      // Attempt Sync
      try {
        if (item.type === "update") {
          const res = await updateWorkoutSession(
            item.sessionId,
            { ...item.payload, expectedUpdatedAt: item.expectedUpdatedAt },
            item.id
          );
          // Update any subsequent queued items for this session with the NEW expectedUpdatedAt
          updateSubsequentExpectedUpdatedAt(queue, item.sessionId, res.updatedAt);
        } else if (item.type === "complete") {
          await completeWorkoutSession(item.sessionId, item.id, item.expectedUpdatedAt);
          // Successfully completed, invalidate
          queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
          queryClient.invalidateQueries({ queryKey: ["activeWorkout"] });
          import('react-hot-toast').then(({ toast }) => toast.success("Offline workouts synced"));
        }

        // Success: remove from queue array in memory
        queue.splice(i, 1);
        i--; // Adjust index
        madeProgress = true;
        
        // Invalidate specific session
        queryClient.invalidateQueries({ queryKey: ["workoutSession", item.sessionId] });

      } catch (err: any) {
        let isPermanent = false;
        let isConflict = false;

        if (isAxiosError(err) && err.response) {
          const status = err.response.status;
          const code = err.response.data?.code; // Expecting AppError format

          if (status === 401) {
            // Unauthorized. Pause sync but do not fail.
            break; 
          }
          if (status === 409 && code === "ERR_CONCURRENCY_CONFLICT") {
            isConflict = true;
          } else if (status === 409 && code === "IDEMPOTENCY_KEY_REUSE") {
            isPermanent = true;
          } else if (status === 409 && code === "IDEMPOTENCY_REQUEST_IN_PROGRESS") {
            // Retry later
          } else if (status === 400 || (status >= 400 && status < 500 && status !== 429)) {
            isPermanent = true; // Other 4xx are permanent
          }
        }

        if (isConflict) {
          item.status = "conflict";
          item.lastError = "Concurrency conflict. Please refresh and review.";
          madeProgress = true;
          import('react-hot-toast').then(({ toast }) => toast.error("Sync conflict detected for workout."));
        } else if (isPermanent) {
          item.status = "failed";
          item.lastError = err.message;
          madeProgress = true;
          import('react-hot-toast').then(({ toast }) => toast.error("Offline workout failed to sync."));
        } else {
          // Network, timeout, 5xx, 429, or REQUEST_IN_PROGRESS
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount > 10) { // arbitrary max bound for unattended retries
            item.status = "failed";
            item.lastError = "Max retries exceeded.";
          }
          madeProgress = true;
          // Exponential backoff could be added here by scheduling a timeout,
          // but for now we just break the loop to yield, and it will retry next online event
          // or next triggerSync.
          break; // Stop processing further items to allow backoff
        }
      }
    }

    if (madeProgress) {
      await saveQueue(queue);
      
      // If we still have pending items and we broke due to a transient error, schedule a retry
      const hasPending = queue.some(q => q.status === "pending" && q.userId === currentAuthUserId);
      if (hasPending && navigator.onLine) {
        setTimeout(() => triggerSync(), 5000); // basic backoff
      }
    }
  } finally {
    isSyncing = false;
  }
}

function updateSubsequentExpectedUpdatedAt(queue: QueuedWorkoutMutation[], sessionId: string, newDate: string) {
  for (const item of queue) {
    if (item.sessionId === sessionId) {
      item.expectedUpdatedAt = newDate;
    }
  }
}

// Global listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", triggerSync);
}
