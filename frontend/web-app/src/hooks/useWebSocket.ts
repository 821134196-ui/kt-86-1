import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  onMessage?: (data: any) => void;
  protocols?: string | string[];
}

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const {
    autoConnect = true,
    onMessage,
    protocols,
  } = options;

  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectCountRef = useRef(0);

  const buildUrl = useCallback((path: string): string => {
    if (options.url) {
      return options.url;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}${path}`;
  }, [options.url]);

  const connect = useCallback((path: string = '/telemetry-ws') => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const url = buildUrl(path);

    try {
      const socket = protocols ? new WebSocket(url, protocols) : new WebSocket(url);

      socket.onopen = () => {
        setIsConnected(true);
        reconnectCountRef.current = 0;
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        if (!event.wasClean && reconnectCountRef.current < 10) {
          reconnectCountRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000);
          reconnectTimerRef.current = window.setTimeout(() => {
            connect(path);
          }, delay);
        }
      };

      socket.onerror = () => {
        setIsConnected(false);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (e) {
          setLastMessage(event.data);
          onMessage?.(event.data);
        }
      };

      socketRef.current = socket;
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  }, [buildUrl, protocols, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    socketRef.current?.close();
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback((data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      socketRef.current.send(payload);
    }
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
  };
};
