/**
 * LearnBridge Offline Store (IndexedDB)
 * Durable client-side persistence for courses, offline packages,
 * draft form answers, quiz attempts, and synchronization queues.
 */

const DB_NAME = 'learnbridge_offline_db';
const DB_VERSION = 2;

class LearnBridgeLocalStore {
  constructor() {
    this.db = null;
    this._initPromise = this.init();
  }

  async init() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[LearnBridgeLocalStore] IndexedDB not supported; in-memory fallback active.');
      this._fallbackStore = new Map();
      return null;
    }

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 1. Lessons & Course Packages
        if (!db.objectStoreNames.contains('packages')) {
          db.createObjectStore('packages', { keyPath: 'id' });
        }

        // 2. Draft Answers & Form Data
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'id' });
        }

        // 3. Quiz Attempts & Activity Progress
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'id' });
        }

        // 4. Synchronization Queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'operationId' });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('[LearnBridgeLocalStore] Failed to open IndexedDB:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  async _getStore(storeName, mode = 'readonly') {
    await this._initPromise;
    if (!this.db) return null;
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // -------------------------------------------------------------
  // DRAFT ANSWERS & PROGRESS
  // -------------------------------------------------------------

  async saveDraft(id, data) {
    const store = await this._getStore('drafts', 'readwrite');
    if (!store) {
      if (this._fallbackStore) this._fallbackStore.set(`draft_${id}`, data);
      return true;
    }
    return new Promise((resolve, reject) => {
      const record = { id, data, updatedAt: Date.now() };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getDraft(id) {
    const store = await this._getStore('drafts', 'readonly');
    if (!store) {
      return this._fallbackStore ? this._fallbackStore.get(`draft_${id}`) : null;
    }
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveProgress(lessonId, progressRecord) {
    const store = await this._getStore('progress', 'readwrite');
    if (!store) return true;
    return new Promise((resolve, reject) => {
      const record = { id: lessonId, ...progressRecord, updatedAt: Date.now() };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getProgress(lessonId) {
    const store = await this._getStore('progress', 'readonly');
    if (!store) return null;
    return new Promise((resolve, reject) => {
      const req = store.get(lessonId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // -------------------------------------------------------------
  // SYNC QUEUE OPERATIONS
  // -------------------------------------------------------------

  async queueOperation(type, payload, targetEndpoint) {
    const store = await this._getStore('sync_queue', 'readwrite');
    const operationId = `sync-op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const operation = {
      operationId,
      type,
      payload,
      endpoint: targetEndpoint,
      status: 'pending', // 'pending' | 'syncing' | 'failed'
      timestamp: Date.now(),
      retryCount: 0
    };

    if (!store) {
      if (this._fallbackStore) this._fallbackStore.set(operationId, operation);
      return operation;
    }

    return new Promise((resolve, reject) => {
      const req = store.put(operation);
      req.onsuccess = () => resolve(operation);
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingOperations() {
    const store = await this._getStore('sync_queue', 'readonly');
    if (!store) return [];

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const pending = (req.result || []).filter(op => op.status === 'pending' || op.status === 'failed');
        resolve(pending.sort((a, b) => a.timestamp - b.timestamp));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async markOperationComplete(operationId) {
    const store = await this._getStore('sync_queue', 'readwrite');
    if (!store) return true;
    return new Promise((resolve, reject) => {
      const req = store.delete(operationId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async updateOperationRetry(operationId, errorMsg) {
    const store = await this._getStore('sync_queue', 'readwrite');
    if (!store) return;
    return new Promise((resolve, reject) => {
      const getReq = store.get(operationId);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) return resolve();
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = errorMsg;
        item.status = item.retryCount > 5 ? 'dead-letter' : 'failed';
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  // -------------------------------------------------------------
  // OFFLINE PACKAGES (LESSONS & MEDIA)
  // -------------------------------------------------------------

  async savePackage(packageMeta) {
    const store = await this._getStore('packages', 'readwrite');
    if (!store) return true;
    return new Promise((resolve, reject) => {
      const req = store.put(packageMeta);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllPackages() {
    const store = await this._getStore('packages', 'readonly');
    if (!store) return [];
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async removePackage(id) {
    const store = await this._getStore('packages', 'readwrite');
    if (!store) return true;
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LearnBridgeLocalStore };
} else if (typeof window !== 'undefined') {
  window.LearnBridgeLocalStore = LearnBridgeLocalStore;
}
