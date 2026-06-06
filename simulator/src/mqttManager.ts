import mqtt, { MqttClient } from 'mqtt';
import { MQTT_BROKER_URL } from './config';
import { Command, CommandAck, HeartbeatPayload, RegisterPayload, TelemetryData } from './types';

export class MqttManager {
  private client: MqttClient | null = null;
  private commandHandlers: Map<string, (command: Command) => void> = new Map();

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(MQTT_BROKER_URL, {
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        clean: true
      });

      this.client.on('connect', () => {
        console.log(`[MQTT] Connected to ${MQTT_BROKER_URL}`);
        resolve();
      });

      this.client.on('error', (err) => {
        console.error('[MQTT] Error:', err.message);
        reject(err);
      });

      this.client.on('reconnect', () => {
        console.log('[MQTT] Reconnecting...');
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });
    });
  }

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const parts = topic.split('/');
      if (parts.length >= 3 && parts[0] === 'devices' && parts[2] === 'commands') {
        const deviceId = parts[1];
        const command: Command = JSON.parse(message.toString());
        const handler = this.commandHandlers.get(deviceId);
        if (handler) {
          handler(command);
        }
      }
    } catch (err) {
      console.error('[MQTT] Error handling message:', err);
    }
  }

  subscribeCommands(deviceId: string, handler: (command: Command) => void): void {
    const topic = `devices/${deviceId}/commands`;
    this.commandHandlers.set(deviceId, handler);
    if (this.client && this.client.connected) {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT] Failed to subscribe ${topic}:`, err.message);
        } else {
          console.log(`[MQTT] Subscribed to ${topic}`);
        }
      });
    }
  }

  publishRegister(deviceId: string, payload: RegisterPayload): void {
    const topic = `devices/${deviceId}/register`;
    this.publish(topic, payload);
  }

  publishHeartbeat(deviceId: string, payload: HeartbeatPayload): void {
    const topic = `devices/${deviceId}/heartbeat`;
    this.publish(topic, payload);
  }

  publishTelemetry(deviceId: string, payload: TelemetryData): void {
    const topic = `devices/${deviceId}/telemetry`;
    this.publish(topic, payload);
  }

  publishAck(deviceId: string, payload: CommandAck): void {
    const topic = `devices/${deviceId}/acks`;
    this.publish(topic, payload);
  }

  private publish(topic: string, payload: any): void {
    if (this.client && this.client.connected) {
      this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT] Failed to publish ${topic}:`, err.message);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.client.connected;
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      console.log('[MQTT] Disconnected');
    }
  }
}

export const mqttManager = new MqttManager();
