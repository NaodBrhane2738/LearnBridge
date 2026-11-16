/**
 * LearnBridge Unified Voice State Machine
 * Deterministic finite state machine for voice input, audio output, and lifecycle management.
 */

const VoiceState = Object.freeze({
  IDLE: 'IDLE',
  REQUESTING_PERMISSION: 'REQUESTING_PERMISSION',
  INITIALIZING: 'INITIALIZING',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  SPEAKING: 'SPEAKING',
  PAUSED: 'PAUSED',
  UNSUPPORTED: 'UNSUPPORTED',
  ERROR: 'ERROR'
});

const ALLOWED_TRANSITIONS = {
  [VoiceState.IDLE]: [VoiceState.REQUESTING_PERMISSION, VoiceState.INITIALIZING, VoiceState.SPEAKING, VoiceState.UNSUPPORTED, VoiceState.ERROR],
  [VoiceState.REQUESTING_PERMISSION]: [VoiceState.INITIALIZING, VoiceState.IDLE, VoiceState.ERROR, VoiceState.UNSUPPORTED],
  [VoiceState.INITIALIZING]: [VoiceState.LISTENING, VoiceState.IDLE, VoiceState.ERROR, VoiceState.UNSUPPORTED],
  [VoiceState.LISTENING]: [VoiceState.PROCESSING, VoiceState.SPEAKING, VoiceState.PAUSED, VoiceState.IDLE, VoiceState.ERROR],
  [VoiceState.PROCESSING]: [VoiceState.LISTENING, VoiceState.SPEAKING, VoiceState.PAUSED, VoiceState.IDLE, VoiceState.ERROR],
  [VoiceState.SPEAKING]: [VoiceState.LISTENING, VoiceState.PAUSED, VoiceState.IDLE, VoiceState.ERROR],
  [VoiceState.PAUSED]: [VoiceState.LISTENING, VoiceState.SPEAKING, VoiceState.IDLE, VoiceState.ERROR],
  [VoiceState.UNSUPPORTED]: [VoiceState.IDLE], // manual reset only
  [VoiceState.ERROR]: [VoiceState.IDLE, VoiceState.REQUESTING_PERMISSION, VoiceState.INITIALIZING]
};

class VoiceStateMachine {
  constructor(initialState = VoiceState.IDLE) {
    this._state = initialState;
    this._listeners = new Set();
    this._history = [];
    this._sessionId = 1;
  }

  get state() {
    return this._state;
  }

  get sessionId() {
    return this._sessionId;
  }

  rotateSession() {
    this._sessionId++;
    return this._sessionId;
  }

  canTransitionTo(nextState) {
    const allowed = ALLOWED_TRANSITIONS[this._state];
    return Array.isArray(allowed) && allowed.includes(nextState);
  }

  transition(nextState, context = {}) {
    if (this._state === nextState) return false;

    if (!this.canTransitionTo(nextState)) {
      console.warn(`[VoiceStateMachine] Invalid transition attempted: ${this._state} -> ${nextState}`);
      return false;
    }

    const prevState = this._state;
    this._state = nextState;
    const transitionRecord = {
      from: prevState,
      to: nextState,
      timestamp: Date.now(),
      sessionId: this._sessionId,
      context
    };

    this._history.push(transitionRecord);
    if (this._history.length > 50) this._history.shift();

    for (const listener of this._listeners) {
      try {
        listener(nextState, prevState, transitionRecord);
      } catch (err) {
        console.error('[VoiceStateMachine] Listener error:', err);
      }
    }

    return true;
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  getHistory() {
    return [...this._history];
  }

  reset() {
    this._state = VoiceState.IDLE;
    this._sessionId++;
    this._history = [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VoiceState, VoiceStateMachine };
} else if (typeof window !== 'undefined') {
  window.VoiceState = VoiceState;
  window.VoiceStateMachine = VoiceStateMachine;
}
