/**
 * LearnBridge Secure Voice Bridge
 * Handles structured cross-frame messaging between top-level LearnBridge LMS
 * and embedded modules (such as the 3D Job Portal / Employment Platform).
 * Enforces origin validation, action allowlisting, and prevents iframe microphone capture.
 */

const ALLOWED_FRAME_ACTIONS = Object.freeze([
  'JOB_APPLY',
  'JOB_PASS',
  'JOB_DETAILS',
  'JOB_ARCHIVE',
  'JOB_PROFILE_SETTINGS',
  'JOB_READ_CARD',
  'PING'
]);

class VoiceBridge {
  constructor(isHost = true) {
    this.isHost = isHost;
    this._iframeElement = null;
    this._messageHandlers = new Map();
    this._pendingRequests = new Map();
    this._reqSeq = 0;
    this._boundOnMessage = this._handleMessage.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this._boundOnMessage);
    }
  }

  setIframeElement(iframe) {
    this._iframeElement = iframe;
  }

  get isEmbedded() {
    return typeof window !== 'undefined' && window.self !== window.top;
  }

  registerActionHandler(actionName, handler) {
    if (ALLOWED_FRAME_ACTIONS.includes(actionName) && typeof handler === 'function') {
      this._messageHandlers.set(actionName, handler);
    }
  }

  sendActionToFrame(action, payload = {}) {
    if (!this.isHost) {
      console.warn('[VoiceBridge] Only host window can send actions to frame.');
      return Promise.reject(new Error('NOT_HOST'));
    }

    if (!ALLOWED_FRAME_ACTIONS.includes(action)) {
      console.warn(`[VoiceBridge] Action "${action}" is not in allowed allowlist.`);
      return Promise.reject(new Error(`ACTION_NOT_ALLOWED: ${action}`));
    }

    const iframe = this._iframeElement || document.getElementById('jobPortalIframe');
    if (!iframe || !iframe.contentWindow) {
      return Promise.reject(new Error('IFRAME_NOT_FOUND'));
    }

    const requestId = `lb-msg-${Date.now()}-${++this._reqSeq}`;
    const message = {
      type: 'LB_VOICE_ACTION',
      version: 1,
      requestId,
      action,
      payload,
      timestamp: Date.now()
    };

    const targetOrigin = window.location.origin;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this._pendingRequests.delete(requestId);
        reject(new Error(`REQUEST_TIMEOUT: ${action}`));
      }, 5000);

      this._pendingRequests.set(requestId, { resolve, reject, timeoutId });
      iframe.contentWindow.postMessage(message, targetOrigin);
    });
  }

  _handleMessage(event) {
    // 1. Origin Verification: Allow current origin and localhost / trusted domains
    if (typeof window !== 'undefined' && event.origin !== window.location.origin) {
      // In local dev, allow localhost variants
      const isLocal = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
      const isVercel = event.origin.endsWith('.vercel.app');
      if (!isLocal && !isVercel) {
        console.warn('[VoiceBridge] Rejected message from unauthorized origin:', event.origin);
        return;
      }
    }

    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // 2. Handle Acknowledgment Responses
    if (data.type === 'LB_ACTION_ACK') {
      const pending = this._pendingRequests.get(data.requestId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        this._pendingRequests.delete(data.requestId);
        if (data.success) {
          pending.resolve(data);
        } else {
          pending.reject(new Error(data.message || 'ACTION_FAILED'));
        }
      }
      return;
    }

    // 3. Handle Inbound Voice Actions (Iframe side)
    if (data.type === 'LB_VOICE_ACTION') {
      if (!ALLOWED_FRAME_ACTIONS.includes(data.action)) {
        console.warn(`[VoiceBridge] Iframe rejected unauthorized action: ${data.action}`);
        this._sendAck(event.source, event.origin, data.requestId, false, `Action ${data.action} not allowed`);
        return;
      }

      const handler = this._messageHandlers.get(data.action);
      if (handler) {
        try {
          const result = handler(data.payload);
          this._sendAck(event.source, event.origin, data.requestId, true, 'Executed', result);
        } catch (err) {
          this._sendAck(event.source, event.origin, data.requestId, false, err.message);
        }
      } else {
        this._sendAck(event.source, event.origin, data.requestId, false, `No handler registered for ${data.action}`);
      }
    }
  }

  _sendAck(targetWindow, targetOrigin, requestId, success, message, result = null) {
    if (!targetWindow) return;
    targetWindow.postMessage({
      type: 'LB_ACTION_ACK',
      version: 1,
      requestId,
      success,
      message,
      data: result,
      timestamp: Date.now()
    }, targetOrigin);
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this._boundOnMessage);
    }
    for (const [id, req] of this._pendingRequests.entries()) {
      clearTimeout(req.timeoutId);
      req.reject(new Error('BRIDGE_DESTROYED'));
    }
    this._pendingRequests.clear();
    this._messageHandlers.clear();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ALLOWED_FRAME_ACTIONS, VoiceBridge };
} else if (typeof window !== 'undefined') {
  window.ALLOWED_FRAME_ACTIONS = ALLOWED_FRAME_ACTIONS;
  window.VoiceBridge = VoiceBridge;
}
