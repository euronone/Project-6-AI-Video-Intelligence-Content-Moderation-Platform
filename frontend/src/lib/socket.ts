import { io, type Socket } from 'socket.io-client';
import { WS_URL } from '@/lib/constants';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect_error', (err) => {
      console.error('[socket] connection error:', err.message);
    });
  }
  return socket;
}

export function connectSocket(token: string): void {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export type SocketEventHandler<T = unknown> = (data: T) => void;

export interface StreamStatusPayload {
  stream_id: string;
  status: 'active' | 'paused' | 'stopped' | 'error';
  timestamp: string;
}

export interface ModerationAlertPayload {
  video_id?: string;
  stream_id?: string;
  category: string;
  confidence: number;
  timestamp: string;
  queue_item_id: string;
}

export interface LiveFramePayload {
  stream_id: string;
  frame_url: string;
  timestamp: string;
  sequence: number;
}
