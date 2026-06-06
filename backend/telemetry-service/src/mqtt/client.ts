import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config';
import { logger } from '../utils/logger';
import { TelemetryData } from '../types';
import { telemetryService } from '../services/telemetry.service';

type TelemetryCallback = (data: TelemetryData) => void;

class MQTTService {
  private client: MqttClient | null = null;
  private callbacks: TelemetryCallback[] = [];
  private connected = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(config.mqttBrokerUrl, {
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      });

      this.client.on('connect', () => {
        logger.info('MQTT connected successfully');
        this.connected = true;
        this.client!.subscribe('devices/+/telemetry', (err) => {
          if (err) {
            logger.error('Failed to subscribe to telemetry topic', { error: err.message });
            reject(err);
          } else {
            logger.info('Subscribed to devices/+/telemetry');
            resolve();
          }
        });
      });

      this.client.on('error', (err) => {
        logger.error('MQTT client error', { error: err.message });
        if (!this.connected) {
          reject(err);
        }
      });

      this.client.on('reconnect', () => {
        logger.info('MQTT reconnecting...');
      });

      this.client.on('close', () => {
        this.connected = false;
        logger.info('MQTT connection closed');
      });

      this.client.on('message', (topic, payload) => {
        this.handleMessage(topic, payload);
      });
    });
  }

  private handleMessage(topic: string, payload: Buffer): void {
    try {
      const topicParts = topic.split('/');
      if (topicParts.length !== 3 || topicParts[2] !== 'telemetry') {
        return;
      }

      const deviceId = topicParts[1];
      const message = JSON.parse(payload.toString());

      const telemetryData: TelemetryData = {
        deviceId,
        capability: message.capability,
        value: parseFloat(message.value),
        timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      };

      if (isNaN(telemetryData.value)) {
        logger.warn('Invalid telemetry value received', { deviceId, capability: message.capability });
        return;
      }

      telemetryService.processTelemetry(telemetryData);

      this.callbacks.forEach((cb) => cb(telemetryData));
    } catch (err) {
      logger.error('Failed to process MQTT message', {
        topic,
        error: (err as Error).message,
      });
    }
  }

  onTelemetry(callback: TelemetryCallback): void {
    this.callbacks.push(callback);
  }

  isConnected(): boolean {
    return this.connected;
  }

  healthCheck(): boolean {
    return this.connected;
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, {}, () => resolve());
      } else {
        resolve();
      }
    });
  }
}

export const mqttService = new MQTTService();
