import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://app-main-backend.onrender.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(userId) {
    if (this.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token'),
        userId
      }
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('Disconnected from server');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Listen for location update requests (every 4 seconds)
    this.socket.on('requestLocationUpdate', () => {
      if (this.onLocationUpdateRequest) {
        this.onLocationUpdateRequest();
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  setLocationUpdateHandler(handler) {
    this.onLocationUpdateRequest = handler;
  }
}

export const socketService = new SocketService();