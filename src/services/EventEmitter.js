// src/services/EventEmitter.js

class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(eventName, listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
    // Return an unsubscribe function for easy cleanup
    return () => this.off(eventName, listener);
  }

  off(eventName, listener) {
    if (!this.events[eventName]) return;
    this.events[eventName] = this.events[eventName].filter(l => l !== listener);
  }

  emit(eventName, ...args) {
    if (!this.events[eventName]) return;
    this.events[eventName].forEach(listener => listener(...args));
  }
}

// Export a singleton instance so the whole app uses the same emitter
export const AppEventEmitter = new EventEmitter();
