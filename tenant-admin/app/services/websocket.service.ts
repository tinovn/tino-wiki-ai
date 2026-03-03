import { io, Socket } from 'socket.io-client';
import { getAccessToken, getTenantId } from '@/lib/auth';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

function getWsBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && apiUrl.startsWith('http')) return apiUrl.replace(/\/api\/v1\/?$/, '');
  // Fallback: backend on same host, port 3000
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  // Validate credentials before connecting
  const token = getAccessToken();
  const tenantId = getTenantId();

  if (!token || !tenantId) {
    console.warn('[WS] Missing token or tenantId, skipping connection');
    // Return a disconnected socket to avoid null errors downstream
    if (!socket) {
      socket = io(`${getWsBaseUrl()}/ws/conversations`, { autoConnect: false });
    }
    return socket;
  }

  const baseUrl = getWsBaseUrl();

  // Cleanup existing socket if disconnected
  if (socket && !socket.connected) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(`${baseUrl}/ws/conversations`, {
    auth: {
      token,
      tenantId,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.log('[WS] Connected to conversations gateway');
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
    // If server disconnected us, try to reconnect with fresh token
    if (reason === 'io server disconnect') {
      const freshToken = getAccessToken();
      if (freshToken && socket) {
        socket.auth = { token: freshToken, tenantId: getTenantId() };
        socket.connect();
      }
    }
  });

  socket.on('connect_error', (error) => {
    console.error('[WS] Connection error:', error.message);
    // Refresh auth on every reconnect attempt
    if (socket) {
      const freshToken = getAccessToken();
      if (freshToken) {
        socket.auth = { token: freshToken, tenantId: getTenantId() };
      }
    }
  });

  // Handle server-sent error events (token expired, etc.)
  socket.on('error', (err: { message: string; code?: string }) => {
    console.error('[WS] Server error:', err.message, err.code);
    if (err.code === 'TOKEN_EXPIRED') {
      // Token expired — refresh and reconnect
      const freshToken = getAccessToken();
      if (freshToken && socket) {
        socket.auth = { token: freshToken, tenantId: getTenantId() };
        socket.connect();
      }
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinConversation(conversationId: string) {
  socket?.emit('join_conversation', { conversationId });
}

export function leaveConversation(conversationId: string) {
  socket?.emit('leave_conversation', { conversationId });
}

export function emitTyping(conversationId: string, isTyping: boolean) {
  socket?.emit('typing', { conversationId, isTyping });
}
