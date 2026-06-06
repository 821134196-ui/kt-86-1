import axios from 'axios';
import logger from '../utils/logger';
import { config } from '../config';
import { TelemetryData } from '../types';
import mqttService, { MqttMessage } from '../services/mqtt';
import db from '../services/database';

class TelemetryForwarder {
  private forwardToService: boolean = true;

  constructor() {
    this.setupMqttListeners();
  }

  private setupMqttListeners(): void {
    mqttService.on('telemetry', this.handleTelemetry.bind(this));
  }

  private async handleTelemetry(message: MqttMessage): Promise<void> {
    try {
      const { deviceId, payload } = message;
      if (!deviceId) return;

      let telemetryData: Record<string, any>;
      try {
        telemetryData = JSON.parse(payload.toString());
      } catch (parseError: any) {
        logger.warn(`Failed to parse telemetry from device ${deviceId}: ${parseError.message}`);
        return;
      }

      const timestamp = telemetryData.timestamp || Date.now();
      const data = telemetryData.data || telemetryData;

      const telemetry: TelemetryData = {
        deviceId,
        timestamp,
        data,
      };

      logger.debug(`Telemetry received from device ${deviceId}`);

      await this.updateDeviceCurrentState(deviceId, data);

      if (this.forwardToService) {
        await this.forwardToTelemetryService(telemetry).catch((err) => {
          logger.warn(`Failed to forward telemetry for device ${deviceId}: ${err.message}`);
        });
      }
    } catch (error) {
      logger.error('Error handling telemetry:', error);
    }
  }

  private async updateDeviceCurrentState(deviceId: string, data: Record<string, any>): Promise<void> {
    try {
      await db.query(
        `UPDATE devices 
         SET current_state = COALESCE(current_state, '{}'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(data), deviceId]
      );
    } catch (error) {
      logger.error(`Failed to update device state for ${deviceId}:`, error);
    }
  }

  private async forwardToTelemetryService(telemetry: TelemetryData): Promise<void> {
    const telemetryServiceUrl = config.telemetryServiceUrl;
    
    if (!telemetryServiceUrl) {
      logger.debug('Telemetry service URL not configured, skipping forward');
      return;
    }

    try {
      await axios.post(
        `${telemetryServiceUrl}/api/telemetry/ingest`,
        telemetry,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      logger.debug(`Telemetry forwarded for device ${telemetry.deviceId}`);
    } catch (error: any) {
      if (error.response) {
        logger.warn(`Telemetry service responded with ${error.response.status}: ${error.message}`);
      } else if (error.request) {
        logger.warn(`No response from telemetry service: ${error.message}`);
      } else {
        logger.warn(`Error forwarding telemetry: ${error.message}`);
      }
      throw error;
    }
  }

  setForwardingEnabled(enabled: boolean): void {
    this.forwardToService = enabled;
    logger.info(`Telemetry forwarding ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export const telemetryForwarder = new TelemetryForwarder();
export default telemetryForwarder;
