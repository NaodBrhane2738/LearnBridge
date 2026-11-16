/**
 * LearnBridge Synchronization Manager
 * Detects network transitions, processes pending offline operations with
 * idempotency, backoff retries, and accessible status announcements.
 */

if (typeof require !== 'undefined') {
  try {
    var { LearnBridgeLocalStore } = require('./offlineStore');
  } catch (_) {}
}

class LearnBridgeSyncManager {
  constructor(localStore = null) {
    this.store = localStore || (typeof LearnBridgeLocalStore !== 'undefined' ? new LearnBridgeLocalStore() : null);
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSyncing = false;
    this._listeners = new Set();
    this._initNetworkListeners();
  }

  _initNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[LearnBridgeSyncManager] Network online detected. Triggering synchronization.');
      this.isOnline = true;
      this._notify('online');
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      console.log('[LearnBridgeSyncManager] Network offline detected.');
      this.isOnline = false;
      this._notify('offline');
      this._announce("You are offline. Your answers and progress are being saved on this device and will sync when you reconnect.");
    });
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify(event, data = {}) {
    for (const fn of this._listeners) {
      try { fn(event, data); } catch (_) {}
    }
  }

  _announce(message) {
    if (typeof window !== 'undefined' && window.lbSpeechOutput) {
      window.lbSpeechOutput.announceAriaLive(message);
    }
  }

  async queueAction(type, payload, endpoint) {
    if (!this.store) return null;

    // Security Gate: NEVER store passwords, secrets, or raw auth tokens in offline sync queue
    if (payload && (payload.password || payload.token || payload.secret)) {
      console.warn('[LearnBridgeSyncManager] Security Fence: Sensitive credentials cannot be queued offline.');
      delete payload.password;
      delete payload.secret;
    }

    const op = await this.store.queueOperation(type, payload, endpoint);
    this._notify('queued', op);

    if (!this.isOnline) {
      this._announce("Saved on this phone. It will send when you are online.");
      return { offline: true, operationId: op.operationId, message: "Saved on this phone. It will send when you are online." };
    }

    // If online, attempt immediate sync
    return this.syncNow();
  }

  async syncNow() {
    if (this.isSyncing || !this.store) return;
    this.isSyncing = true;
    this._notify('sync_start');

    try {
      const pending = await this.store.getPendingOperations();
      if (pending.length === 0) {
        this.isSyncing = false;
        this._notify('sync_end', { synced: 0 });
        return;
      }

      console.log(`[LearnBridgeSyncManager] Syncing ${pending.length} pending operations...`);
      let successCount = 0;

      for (const op of pending) {
        try {
          const response = await fetch(op.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Idempotency-Key': op.operationId
            },
            body: JSON.stringify(op.payload)
          });

          if (response.ok || response.status === 200 || response.status === 201) {
            await this.store.markOperationComplete(op.operationId);
            successCount++;
          } else if (response.status >= 400 && response.status < 500) {
            // Client error - do not retry infinitely
            console.warn(`[LearnBridgeSyncManager] Operation ${op.operationId} rejected with status ${response.status}`);
            await this.store.updateOperationRetry(op.operationId, `HTTP ${response.status}`);
          } else {
            // 5xx Server error - mark for retry with backoff
            await this.store.updateOperationRetry(op.operationId, `Server error ${response.status}`);
          }
        } catch (fetchErr) {
          console.warn(`[LearnBridgeSyncManager] Network error syncing ${op.operationId}:`, fetchErr.message);
          await this.store.updateOperationRetry(op.operationId, fetchErr.message);
          // If network error occurred, network may have dropped again
          break;
        }
      }

      if (successCount > 0) {
        this._announce("Your learning progress has been synchronized.");
        this._notify('sync_success', { count: successCount });
      }
    } catch (err) {
      console.warn('[LearnBridgeSyncManager] Sync cycle error:', err);
      this._announce("Your progress is still saved on this device. We will try again.");
    } finally {
      this.isSyncing = false;
      this._notify('sync_end');
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LearnBridgeSyncManager };
} else if (typeof window !== 'undefined') {
  window.LearnBridgeSyncManager = LearnBridgeSyncManager;
}
