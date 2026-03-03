import { io, Socket } from 'socket.io-client';
import { getAccessToken, getTenantId } from '@/lib/auth';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const baseUrl = apiUrl.replace('/api/v1', '');

  socket = io(`${baseUrl}/ws/conversations`, {
    auth: {
      token: getAccessToken(),
      tenantId: getTenantId(),
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('[WS] Connected to conversations gateway');
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[WS] Connection error:', error.message);
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
