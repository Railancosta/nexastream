// NexaStream Real-time WebSocket Service
// Socket.io integration for live features

import { api } from './api';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001') {
    if (typeof window === 'undefined') return;
    
    // Dynamic import to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      this.socket = io(serverUrl, {
        auth: { token: api.token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.socket.on('connect', () => {
        console.log('🔌 Socket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        this.connected = false;
        this.emit('disconnected', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
        this.emit('error', error);
      });

      // Setup default event listeners
      this.setupListeners();
    });
  }

  setupListeners() {
    if (!this.socket) return;

    // Real-time video updates
    this.socket.on('video:view', (data) => {
      this.emit('video:view', data);
    });

    this.socket.on('video:like', (data) => {
      this.emit('video:like', data);
    });

    // Live stream events
    this.socket.on('stream:started', (data) => {
      this.emit('stream:started', data);
    });

    this.socket.on('stream:ended', (data) => {
      this.emit('stream:ended', data);
    });

    this.socket.on('stream:viewers', (data) => {
      this.emit('stream:viewers', data);
    });

    // Chat events
    this.socket.on('chat:message', (data) => {
      this.emit('chat:message', data);
    });

    this.socket.on('chat:delete', (data) => {
      this.emit('chat:delete', data);
    });

    // Notification events
    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    // Subscription events
    this.socket.on('user:subscribed', (data) => {
      this.emit('user:subscribed', data);
    });

    // Reward events
    this.socket.on('reward:earned', (data) => {
      this.emit('reward:earned', data);
    });

    // NFT events
    this.socket.on('nft:minted', (data) => {
      this.emit('nft:minted', data);
    });

    this.socket.on('nft:sold', (data) => {
      this.emit('nft:sold', data);
    });

    // Platform stats
    this.socket.on('stats:update', (data) => {
      this.emit('stats:update', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Emit event
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Subscribe to event
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to specific video chat
  joinVideoChat(videoId) {
    if (this.socket) {
      this.socket.emit('video:join', { videoId });
    }
  }

  leaveVideoChat(videoId) {
    if (this.socket) {
      this.socket.emit('video:leave', { videoId });
    }
  }

  // Subscribe to live stream
  joinStream(streamId) {
    if (this.socket) {
      this.socket.emit('stream:join', { streamId });
    }
  }

  leaveStream(streamId) {
    if (this.socket) {
      this.socket.emit('stream:leave', { streamId });
    }
  }

  // Send chat message
  sendChatMessage(streamId, content, type = 'message') {
    if (this.socket && this.connected) {
      this.socket.emit('chat:send', { streamId, content, type });
    }
  }

  // Send reaction
  sendReaction(targetId, targetType, reactionType) {
    if (this.socket && this.connected) {
      this.socket.emit('reaction:send', { targetId, targetType, reactionType });
    }
  }

  // Update presence
  updatePresence(status) {
    if (this.socket && this.connected) {
      this.socket.emit('presence:update', { status });
    }
  }

  isConnected() {
    return this.connected;
  }
}

// Singleton instance
export const socket = new SocketService();
export default socket;
