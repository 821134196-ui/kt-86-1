import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  onMessage?: (data: any) => void;
}

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const {
    url = import.meta.env.VITE_WS_URL || 'ws://localhost:3003',
    autoConnect = true,
    onMessage,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem('token');
    const socket = io(url, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('telemetry', (data: any) => {
      setLastMessage(data);
      onMessage?.(data);
    });

    socket.on('alert', (data: any) => {
      setLastMessage(data);
      onMessage?.(data);
    });

    socketRef.current = socket;
  }, [url, onMessage]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    send,
    subscribe,
  };
};
