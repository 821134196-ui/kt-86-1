import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config';
import logger from '../utils/logger';
import { EventEmitter } from 'events';

export interface MqttMessage {
  topic: string;
  payload: Buffer;
  deviceId?: string;
}

class MqttService extends EventEmitter {
  private client: MqttClient | null = null;
  private isConnected = false;

  constructor() {
    super();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`Connecting to MQTT broker at ${config.mqttBrokerUrl}...`);

      this.client = mqtt.connect(config.mqttBrokerUrl, {
        clientId: `gateway-service-${Date.now()}`,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      });

      this.client.on('connect', () => {
        logger.info('MQTT client connected successfully');
        this.isConnected = true;
        this.setupSubscriptions();
        resolve();
      });

      this.client.on('error', (err) => {
        logger.error('MQTT client error:', err);
        if (!this.isConnected) {
          reject(err);
        }
      });

      this.client.on('reconnect', () => {
        logger.info('MQTT client reconnecting...');
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.info('MQTT client connection closed');
      });

      this.client.on('message', (topic, payload) => {
        this.handleMessage(topic, payload);
      });
    });
  }

  private setupSubscriptions(): void {
    const topics = [
      'devices/+/register',
      'devices/+/heartbeat',
      'devices/+/telemetry',
      'devices/+/acks',
    ];

    topics.forEach((topic) => {
      this.client?.subscribe(topic, (err) => {
        if (err) {
          logger.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          logger.info(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  private handleMessage(topic: string, payload: Buffer): void {
    logger.debug(`Received MQTT message on topic ${topic}`);

    const topicParts = topic.split('/');
    let deviceId: string | undefined;

    if (topicParts.length >= 2 && topicParts[0] === 'devices') {
      deviceId = topicParts[1];
    }

    const message: MqttMessage = {
      topic,
      payload,
      deviceId,
    };

    this.emit('message', message);

    if (topic.endsWith('/register')) {
      this.emit('register', message);
    } else if (topic.endsWith('/heartbeat')) {
      this.emit('heartbeat', message);
    } else if (topic.endsWith('/telemetry')) {
      this.emit('telemetry', message);
    } else if (topic.endsWith('/acks')) {
      this.emit('ack', message);
    }
  }

  publish(topic: string, payload: string | object, qos: 0 | 1 | 2 = 1): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('MQTT client is not connected'));
        return;
      }

      const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

      this.client.publish(topic, message, { qos }, (err) => {
        if (err) {
          logger.error(`Failed to publish to ${topic}:`, err);
          reject(err);
        } else {
          logger.debug(`Published message to ${topic}`);
          resolve();
        }
      });
    });
  }

  healthCheck(): boolean {
    return this.isConnected;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.endAsync();
      this.isConnected = false;
    }
  }
}

export const mqttService = new MqttService();
export default mqttService;
