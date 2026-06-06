import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger';
import { TelemetryData, ThresholdAlert, WebSocketMessage } from '../types';
import { mqttService } from '../mqtt/client';

interface ClientSubscription {
  ws: WebSocket;
  deviceIds: Set<string>;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientSubscription> = new Map();

  attach(server: HttpServer, path: string): void {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', (ws) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, { ws, deviceIds: new Set() });

      logger.info('WebSocket client connected', { clientId });

      ws.on('message', (data) => {
        this.handleClientMessage(clientId, data.toString());
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info('WebSocket client disconnected', { clientId });
      });

      ws.on('error', (err) => {
        logger.error('WebSocket client error', { clientId, error: err.message });
      });
    });

    mqttService.onTelemetry((data) => {
      this.broadcastTelemetry(data);
    });

    logger.info('WebSocket server attached', { path });
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private handleClientMessage(clientId: string, message: string): void {
    try {
      const parsed: WebSocketMessage = JSON.parse(message);
      const client = this.clients.get(clientId);
      if (!client) return;

      switch (parsed.type) {
        case 'subscribe': {
          const deviceId = (parsed.data as { deviceId: string }).deviceId;
          if (deviceId) {
            client.deviceIds.add(deviceId);
            logger.info('Client subscribed to device', { clientId, deviceId });
          }
          break;
        }
        case 'unsubscribe': {
          const deviceId = (parsed.data as { deviceId: string }).deviceId;
          if (deviceId) {
            client.deviceIds.delete(deviceId);
            logger.info('Client unsubscribed from device', { clientId, deviceId });
          }
          break;
        }
      }
    } catch (err) {
      logger.error('Failed to parse WebSocket message', {
        clientId,
        error: (err as Error).message,
      });
    }
  }

  private broadcastTelemetry(data: TelemetryData): void {
    const message: WebSocketMessage = {
      type: 'telemetry',
      data: {
        ...data,
        timestamp: data.timestamp.toISOString(),
      },
    };
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (client.deviceIds.size === 0 || client.deviceIds.has(data.deviceId)) {
          client.ws.send(messageStr);
        }
      }
    });
  }

  broadcastAlert(alert: ThresholdAlert): void {
    const message: WebSocketMessage = {
      type: 'alert',
      data: {
        ...alert,
        timestamp: alert.timestamp.toISOString(),
      },
    };
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (client.deviceIds.size === 0 || client.deviceIds.has(alert.deviceId)) {
          client.ws.send(messageStr);
        }
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  close(): void {
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const webSocketService = new WebSocketService();
