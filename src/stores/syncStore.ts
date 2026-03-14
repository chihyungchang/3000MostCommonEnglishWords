import { create } from 'zustand';
import { getItem, setItem } from '../utils/storage';

const SYNC_KEY = 'sync_state';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  isOnline: boolean;
  userId: string | null;

  // Actions
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: string) => void;
  setSyncError: (error: string | null) => void;
  setOnline: (online: boolean) => void;
  setUserId: (userId: string | null) => void;
  loadSyncState: () => void;
  saveSyncState: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  userId: null,

  setSyncing: (syncing: boolean) => {
    set({ isSyncing: syncing });
    if (!syncing) {
      get().saveSyncState();
    }
  },

  setLastSyncTime: (time: string) => {
    set({ lastSyncTime: time, syncError: null });
    get().saveSyncState();
  },

  setSyncError: (error: string | null) => {
    set({ syncError: error });
    get().saveSyncState();
  },

  setOnline: (online: boolean) => {
    set({ isOnline: online });
  },

  setUserId: (userId: string | null) => {
    set({ userId });
    if (userId) {
      get().loadSyncState();
    }
  },

  loadSyncState: () => {
    const { userId } = get();
    if (!userId) return;

    const saved = getItem<{ lastSyncTime: string | null }>(`${SYNC_KEY}_${userId}`, {
      lastSyncTime: null,
    });
    set({ lastSyncTime: saved.lastSyncTime });
  },

  saveSyncState: () => {
    const { userId, lastSyncTime } = get();
    if (!userId) return;

    setItem(`${SYNC_KEY}_${userId}`, { lastSyncTime });
  },
}));

// Initialize online/offline detection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSyncStore.getState().setOnline(true);
  });

  window.addEventListener('offline', () => {
    useSyncStore.getState().setOnline(false);
  });
}
