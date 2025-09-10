import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.recentEvents = new Map(); // Track recent events to prevent duplicates
    this.joinedGroups = new Set(); // Track which groups we've joined
  }

  connect(token) {
    // If already connected with the same token, return existing socket
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected, reusing connection');
      return this.socket;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    // Clear recent events and joined groups when disconnecting
    this.recentEvents.clear();
    this.joinedGroups.clear();
  }

  // Check if an event is a duplicate (same event with same data within 1 second)
  isDuplicateEvent(event, data) {
    const eventKey = `${event}_${JSON.stringify(data)}`;
    const now = Date.now();
    
    if (this.recentEvents.has(eventKey)) {
      const lastTime = this.recentEvents.get(eventKey);
      if (now - lastTime < 1000) { // 1 second window
        return true;
      }
    }
    
    this.recentEvents.set(eventKey, now);
    
    // Clean up old events (older than 5 seconds)
    for (const [key, time] of this.recentEvents.entries()) {
      if (now - time > 5000) {
        this.recentEvents.delete(key);
      }
    }
    
    return false;
  }

  on(event, callback) {
    if (this.socket) {
      // Check if this callback is already registered for this event
      if (this.listeners.has(event)) {
        const existingListeners = this.listeners.get(event);
        const alreadyExists = existingListeners.some(l => l.callback === callback);
        if (alreadyExists) {
          console.warn(`Listener already exists for event: ${event}`);
          return;
        }
      }
      
      // Create a wrapper function that we can track
      const wrapper = (data) => {
        // Check for duplicate events
        if (this.isDuplicateEvent(event, data)) {
          console.log(`Duplicate event detected, skipping: ${event}`, data);
          return;
        }
        
        console.log(`Socket event received: ${event}`, data);
        callback(data);
      };
      
      this.socket.on(event, wrapper);
      
      // Store the wrapper for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push({ callback, wrapper });
    } else {
      console.warn(`Socket not connected when trying to listen to ${event}`);
    }
  }

  off(event, callback) {
    if (this.socket && this.listeners.has(event)) {
      const eventListeners = this.listeners.get(event);
      const listenerIndex = eventListeners.findIndex(l => l.callback === callback);
      
      if (listenerIndex !== -1) {
        const { wrapper } = eventListeners[listenerIndex];
        this.socket.off(event, wrapper);
        eventListeners.splice(listenerIndex, 1);
        
        if (eventListeners.length === 0) {
          this.listeners.delete(event);
        }
      }
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.listeners.clear();
    }
    // Clear recent events and joined groups when removing all listeners
    this.recentEvents.clear();
    this.joinedGroups.clear();
  }

  emit(event, data, callback) {
    if (this.socket) {
      this.socket.emit(event, data, callback);
    }
  }

  // Message-related methods
  sendMessage(messageData, callback) {
    this.emit('message:send', messageData, callback);
  }

  startTyping(groupId) {
    console.log('Socket: Emitting typing:start for group:', groupId);
    this.emit('typing:start', { groupId });
  }

  stopTyping(groupId) {
    console.log('Socket: Emitting typing:stop for group:', groupId);
    this.emit('typing:stop', { groupId });
  }

  joinGroup(groupId) {
    if (this.joinedGroups.has(groupId)) {
      console.log('Already joined group:', groupId);
      return;
    }
    
    console.log('Joining group via socket:', groupId);
    this.emit('group:join', { groupId });
    this.joinedGroups.add(groupId);
  }

  leaveGroup(groupId) {
    console.log('Leaving group via socket:', groupId);
    this.emit('group:leave', { groupId });
    this.joinedGroups.delete(groupId);
  }

  // Notification methods
  onNotification(callback) {
    this.on('notification:new', callback);
  }

  // Online status methods
  onUserOnline(callback) {
    this.on('user:online', callback);
  }

  onUserOffline(callback) {
    this.on('user:offline', callback);
  }

  // Remove online status listeners
  offUserOnline(callback) {
    this.off('user:online', callback);
  }

  offUserOffline(callback) {
    this.off('user:offline', callback);
  }

  // Global status change listener
  onUserStatusChanged(callback) {
    this.on('user:status:changed', callback);
  }

  offUserStatusChanged(callback) {
    this.off('user:status:changed', callback);
  }

  // Typing indicator methods
  onTypingStart(callback) {
    this.on('typing:start', callback);
  }

  onTypingStop(callback) {
    this.on('typing:stop', callback);
  }

  offTypingStart(callback) {
    this.off('typing:start', callback);
  }

  offTypingStop(callback) {
    this.off('typing:stop', callback);
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService;