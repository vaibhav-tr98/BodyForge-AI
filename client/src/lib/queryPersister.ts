import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

export const IDB_KEY = 'bodyforge-react-query-cache';

export const bodyForgePersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(IDB_KEY, client);
  },
  restoreClient: async () => {
    return await get<PersistedClient>(IDB_KEY);
  },
  removeClient: async () => {
    await del(IDB_KEY);
  },
};

export const clearBodyForgeCache = async () => {
  await del(IDB_KEY);
};
