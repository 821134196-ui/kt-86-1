import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface TelemetryMessage {
  deviceId: string;
  capability: string;
  value: any;
  timestamp: Date;
}

class MqttClient extends EventEmitter {
  private client: MqttClient | null = null;
  private isConnected = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(config.mqttBrokerUrl, {
          reconnectPeriod: 5000,
          connectTimeout: 30000,
          clientId: `rule-engine-${Math.random().toString(16).substring(2, 10)}`,
        });

        this.client.on('connect', () => {
          this.isConnected = true;
          logger.info('MQTT connected');
          this.subscribeToTopics();
          resolve();
        });

        this.client.on('error', (err) => {
          logger.error('MQTT error', { error: err.message });
          if (!this.isConnected) {
            reject(err);
          }
        });

        this.client.on('reconnect', () => {
          logger.warn('MQTT reconnecting...');
        });

        this.client.on('close', () => {
          this.isConnected = false;
          logger.warn('MQTT connection closed');
        });

        this.client.on('message', (topic, message) => {
          this.handleMessage(topic, message);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private subscribeToTopics() {
    if (!this.client) {
      this.client.subscribe(config.mqttTopics.telemetryPrefix, (err) => {
        if (err) {
          logger.error('Failed to subscribe to telemetry topic', { error: err.message });
        } else {
          logger.info('Subscribed to telemetry topic', { topic: config.mqttTopics.telemetryPrefix });
        }
      });
      this.client.subscribe(config.mqttTopics.deviceState, (err) => {
        if (err) {
          logger.error('Failed to subscribe to device state topic', { error: err.message });
        } else {
          logger.info('Subscribed to device state topic', { topic: config.mqttTopics.deviceState });
        }
      });
    }
  }

  private handleMessage(topic: string, message: Buffer) {
    try {
      const topicParts = topic.split('/');
      const payload = JSON.parse(message.toString());

      if (topic.startsWith('telemetry/')) {
        const [, deviceId, capability] = topicParts;
        const telemetryMsg: TelemetryMessage = {
          deviceId,
          capability,
          value: payload.value ?? payload,
          timestamp: new Date(payload.timestamp || Date.now()),
        };
        this.emit('telemetry', telemetryMsg);
      } else if (topic.startsWith('devices/') && topic.endsWith('/state')) {
        const [, deviceId] = topicParts;
        this.emit('deviceState', { deviceId, state: payload });
      }
    } catch (error: any) {
      logger.error('Failed to parse MQTT message', {
        topic,
        error: error.message,
      });
    }
  }

  publish(topic: string, message: string | object): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('MQTT not connected'));
        return;
      }
      const payload = typeof message === 'object' ? JSON.stringify(message) : message;
      this.client.publish(topic, payload, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (this.client) {
      this.client.end(true);
    }
  }
}

export const mqttClient = new MqttClient();
