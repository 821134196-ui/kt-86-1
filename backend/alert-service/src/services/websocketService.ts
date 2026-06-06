import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../utils/logger';
import { Alert, Notification, WebSocketMessage } from '../types';
import { getRedisClient } from '../config/redis';

const ALERT_CHANNEL = 'alerts:new';
const NOTIFICATION_CHANNEL = 'notifications:new';

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  homeId?: string;
  userId?: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ExtendedWebSocket> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  public init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/api/alerts/ws' });

    this.wss.on('connection', (ws: ExtendedWebSocket, req) => {
      const clientId = this.generateClientId();
      ws.isAlive = true;

      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const homeId = url.searchParams.get('homeId');
      const userId = url.searchParams.get('userId');

      if (homeId) {
        ws.homeId = homeId;
      }
      if (userId) {
        ws.userId = userId;
      }

      this.clients.set(clientId, ws);

      logger.info(`WebSocket client connected: ${clientId}, homeId: ${homeId || 'none'}, userId: ${userId || 'none'}`);

      ws.send(JSON.stringify({
        type: 'ping',
        data: { timestamp: Date.now() }
      } as WebSocketMessage));

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'subscribe' && data.homeId) {
            ws.homeId = data.homeId;
          }
        } catch (err) {
          logger.error('Error parsing WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (err) => {
        logger.error(`WebSocket client error ${clientId}:`, err);
        this.clients.delete(clientId);
      });
    });

    this.pingInterval = setInterval(() => {
      this.clients.forEach((ws, clientId) => {
        if (ws.isAlive === false) {
          ws.terminate();
          this.clients.delete(clientId);
          return;
        }
        ws.isAlive = false;
        try {
          ws.ping();
        } catch (err) {
          logger.error(`Error pinging client ${clientId}:`, err);
        }
      });
    }, 30000);

    this.subscribeToRedis();

    logger.info('WebSocket server initialized');
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private subscribeToRedis(): void {
    try {
      const redis = getRedisClient();
      const subscriber = redis.duplicate();

      subscriber.subscribe(ALERT_CHANNEL, NOTIFICATION_CHANNEL, (err, count) => {
        if (err) {
          logger.error('Error subscribing to Redis channels:', err);
          return;
        }
        logger.info(`Subscribed to ${count} Redis channels for WebSocket notifications`);
      });

      subscriber.on('message', (channel, message) => {
        try {
          const data = JSON.parse(message);
          if (channel === ALERT_CHANNEL) {
            this.broadcastAlert(data);
          } else if (channel === NOTIFICATION_CHANNEL) {
            this.broadcastNotification(data);
          }
        } catch (err) {
          logger.error('Error processing Redis message:', err);
        }
      });
    } catch (err) {
      logger.error('Error setting up Redis subscriber:', err);
    }
  }

  public broadcastAlert(alert: Alert): void {
    const message: WebSocketMessage = {
      type: 'alert',
      data: alert
    };
    const payload = JSON.stringify(message);

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN && ws.homeId === alert.home_id) {
        try {
          ws.send(payload);
        } catch (err) {
          logger.error('Error broadcasting alert to client:', err);
        }
      }
    });

    logger.debug(`Broadcasted alert ${alert.id} to home ${alert.home_id}`);
  }

  public broadcastNotification(notification: Notification): void {
    const message: WebSocketMessage = {
      type: 'notification',
      data: notification
    };
    const payload = JSON.stringify(message);

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN && ws.userId === notification.user_id) {
        try {
          ws.send(payload);
        } catch (err) {
          logger.error('Error broadcasting notification to client:', err);
        }
      }
    });

    logger.debug(`Broadcasted notification ${notification.id} to user ${notification.user_id}`);
  }

  public publishAlertToRedis(alert: Alert): void {
    try {
      const redis = getRedisClient();
      redis.publish(ALERT_CHANNEL, JSON.stringify(alert));
    } catch (err) {
      logger.error('Error publishing alert to Redis:', err);
    }
  }

  public publishNotificationToRedis(notification: Notification): void {
    try {
      const redis = getRedisClient();
      redis.publish(NOTIFICATION_CHANNEL, JSON.stringify(notification));
    } catch (err) {
      logger.error('Error publishing notification to Redis:', err);
    }
  }

  public close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.clients.forEach((ws) => {
      ws.close();
    });
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
    }
    logger.info('WebSocket server closed');
  }
}

export const wsService = new WebSocketService();
