/**
 * LearnBridge Offline Course & Package Manager
 * Manages explicit lesson downloads, calculated package sizes,
 * cache lifecycle, storage usage estimation, and offline lesson indexing.
 */

if (typeof require !== 'undefined') {
  try {
    var { LearnBridgeLocalStore } = require('./offlineStore');
  } catch (_) {}
}

const OFFLINE_MEDIA_CACHE = 'learnbridge-media-v5';

class LearnBridgeOfflineManager {
  constructor(localStore = null) {
    this.store = localStore || (typeof LearnBridgeLocalStore !== 'undefined' ? new LearnBridgeLocalStore() : null);
    this._activeDownloads = new Map();
    this._listeners = new Set();
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

  // -------------------------------------------------------------
  // STORAGE USAGE ESTIMATION
  // -------------------------------------------------------------

  async getStorageEstimate() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usageMB = (est.usage / (1024 * 1024)).toFixed(1);
        const quotaMB = (est.quota / (1024 * 1024)).toFixed(0);
        const percent = ((est.usage / est.quota) * 100).toFixed(1);
        return {
          supported: true,
          usageBytes: est.usage,
          quotaBytes: est.quota,
          usageMB: Number(usageMB),
          quotaMB: Number(quotaMB),
          percentUsed: Number(percent)
        };
      } catch (err) {
        console.warn('[LearnBridgeOfflineManager] Storage estimate error:', err);
      }
    }
    return { supported: false, usageMB: 0, quotaMB: 0, percentUsed: 0 };
  }

  // -------------------------------------------------------------
  // PACKAGE DOWNLOAD PIPELINE
  // -------------------------------------------------------------

  async estimatePackageSize(packageDefinition) {
    const assets = packageDefinition.assets || [];
    let totalBytes = 0;

    for (const asset of assets) {
      if (asset.sizeBytes) {
        totalBytes += asset.sizeBytes;
      } else {
        totalBytes += 150000; // estimated 150KB default per asset
      }
    }

    const sizeMB = (totalBytes / (1024 * 1024)).toFixed(2);
    return {
      totalBytes,
      sizeMB: Number(sizeMB),
      assetCount: assets.length
    };
  }

  async downloadLessonPackage(lessonId, packageDef, onProgress = null) {
    if (this._activeDownloads.has(lessonId)) {
      console.log(`[LearnBridgeOfflineManager] Download already in progress for ${lessonId}`);
      return;
    }

    this._activeDownloads.set(lessonId, { status: 'downloading', percent: 0 });
    this._notify('download_start', { lessonId });

    try {
      const cache = (typeof caches !== 'undefined') ? await caches.open(OFFLINE_MEDIA_CACHE) : null;
      const assets = packageDef.assets || [];
      const total = assets.length;
      let completed = 0;

      for (const asset of assets) {
        try {
          if (cache && asset.url) {
            const req = new Request(asset.url, { mode: 'cors' });
            const res = await fetch(req);
            if (res.ok) {
              await cache.put(req, res.clone());
            }
          }
        } catch (fetchErr) {
          console.warn(`[LearnBridgeOfflineManager] Warning downloading asset ${asset.url}:`, fetchErr.message);
        }

        completed++;
        const percent = Math.round((completed / total) * 100);
        this._activeDownloads.set(lessonId, { status: 'downloading', percent });
        if (typeof onProgress === 'function') onProgress(percent);
        this._notify('download_progress', { lessonId, percent });
      }

      // Save package record in durable store
      if (this.store) {
        await this.store.savePackage({
          id: lessonId,
          title: packageDef.title || 'Lesson',
          downloadedAt: Date.now(),
          assetCount: total,
          estimatedSizeMB: (packageDef.estimatedSizeMB || 1.5),
          status: 'ready'
        });
      }

      this._activeDownloads.delete(lessonId);
      this._notify('download_complete', { lessonId });
      return { success: true, lessonId };
    } catch (err) {
      console.error(`[LearnBridgeOfflineManager] Download failed for ${lessonId}:`, err);
      this._activeDownloads.delete(lessonId);
      this._notify('download_error', { lessonId, error: err.message });
      throw err;
    }
  }

  async getOfflineLibrary() {
    if (!this.store) return [];
    return this.store.getAllPackages();
  }

  async removeOfflineLesson(lessonId) {
    if (this.store) {
      await this.store.removePackage(lessonId);
    }
    this._notify('package_removed', { lessonId });
    return true;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LearnBridgeOfflineManager };
} else if (typeof window !== 'undefined') {
  window.LearnBridgeOfflineManager = LearnBridgeOfflineManager;
}
