import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { config } from '../config';
import { CommandRecord, CommandPayload, CommandAckPayload } from '../types';
import db from '../services/database';
import redisClient from '../services/redis';
import mqttService, { MqttMessage } from '../services/mqtt';
import deviceStatusManager from './deviceStatus';

const IDEMPOTENCY_KEY_PREFIX = 'idempotency:command:';
const COMMAND_CACHE_PREFIX = 'command:';

class CommandService {
  constructor() {
    this.setupMqttListeners();
  }

  private setupMqttListeners(): void {
    mqttService.on('ack', this.handleCommandAck.bind(this));
  }

  private async handleCommandAck(message: MqttMessage): Promise<void> {
    try {
      const { deviceId, payload } = message;
      if (!deviceId) return;

      const ackData: CommandAckPayload = JSON.parse(payload.toString());
      logger.info(`Command ack received for command ${ackData.commandId} from device ${deviceId}`);

      await this.processCommandAck(deviceId, ackData);
    } catch (error) {
      logger.error('Error handling command ack:', error);
    }
  }

  async sendCommand(
    deviceId: string,
    commandType: string,
    commandPayload: Record<string, any>,
    idempotencyKey?: string,
    createdBy?: string
  ): Promise<CommandRecord> {
    if (!deviceStatusManager.isDeviceOnline(deviceId)) {
      throw new Error(`Device ${deviceId} is offline`);
    }

    if (idempotencyKey) {
      const existingCommandId = await this.checkIdempotencyKey(idempotencyKey);
      if (existingCommandId) {
        logger.info(`Idempotency key ${idempotencyKey} already exists, returning existing command ${existingCommandId}`);
        const existingCommand = await this.getCommandById(existingCommandId);
        if (existingCommand) {
          return existingCommand;
        }
      }
    }

    const commandId = uuidv4();

    const commandPayloadToSend: CommandPayload = {
      commandId,
      commandType,
      payload: commandPayload,
      idempotencyKey,
      timestamp: Date.now(),
    };

    const topic = `devices/${deviceId}/commands`;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const insertResult = await client.query(
        `INSERT INTO commands (id, device_id, command_type, payload, idempotency_key, status, created_by)
         VALUES ($1, $2, $3, $4::jsonb, $5, 'pending', $6)
         RETURNING *`,
        [commandId, deviceId, commandType, JSON.stringify(commandPayload), idempotencyKey || null, createdBy || null]
      );

      if (idempotencyKey) {
        await this.storeIdempotencyKey(idempotencyKey, commandId);
      }

      await client.query(
        `UPDATE commands SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [commandId]
      );

      await mqttService.publish(topic, commandPayloadToSend, 1);

      await client.query('COMMIT');

      const commandRecord = await this.getCommandById(commandId);
      if (!commandRecord) {
        throw new Error('Failed to create command record');
      }

      await this.cacheCommand(commandRecord);

      logger.info(`Command ${commandId} sent to device ${deviceId} successfully`);
      return commandRecord;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to send command to device ${deviceId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async storeIdempotencyKey(idempotencyKey: string, commandId: string): Promise<void> {
    const redisKey = `${IDEMPOTENCY_KEY_PREFIX}${idempotencyKey}`;
    await redisClient.set(redisKey, commandId, config.idempotencyTtl);
  }

  private async checkIdempotencyKey(idempotencyKey: string): Promise<string | null> {
    const redisKey = `${IDEMPOTENCY_KEY_PREFIX}${idempotencyKey}`;
    const cachedCommandId = await redisClient.get(redisKey);
    if (cachedCommandId) {
      return cachedCommandId;
    }

    const result = await db.query(
      `SELECT id FROM commands WHERE idempotency_key = $1`,
      [idempotencyKey]
    );

    if (result.rows.length > 0) {
      const commandId = result.rows[0].id;
      await redisClient.set(redisKey, commandId, config.idempotencyTtl);
      return commandId;
    }

    return null;
  }

  private async processCommandAck(deviceId: string, ackData: CommandAckPayload): Promise<void> {
    const { commandId, status, payload, errorMessage } = ackData;

    const dbStatus = status === 'success' ? 'acknowledged' : 'failed';

    try {
      await db.query(
        `UPDATE commands 
         SET status = $1, 
             acknowledged_at = NOW(), 
             response_payload = $2::jsonb,
             error_message = $3
         WHERE id = $4 AND device_id = $5`,
        [
          dbStatus,
          payload ? JSON.stringify(payload) : null,
          errorMessage || null,
          commandId,
          deviceId,
        ]
      );

      const updatedCommand = await this.getCommandById(commandId);
      if (updatedCommand) {
        await this.cacheCommand(updatedCommand);
      }

      logger.info(`Command ${commandId} acknowledged with status: ${status}`);
    } catch (error) {
      logger.error(`Failed to process command ack for ${commandId}:`, error);
    }
  }

  async getCommandById(commandId: string): Promise<CommandRecord | null> {
    const cached = await this.getCachedCommand(commandId);
    if (cached) {
      return cached;
    }

    const result = await db.query(
      `SELECT * FROM commands WHERE id = $1`,
      [commandId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const record = this.mapRowToCommandRecord(result.rows[0]);
    await this.cacheCommand(record);
    return record;
  }

  async getCommandsByDeviceId(deviceId: string, limit: number = 20): Promise<CommandRecord[]> {
    const result = await db.query(
      `SELECT * FROM commands WHERE device_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [deviceId, limit]
    );

    return result.rows.map(this.mapRowToCommandRecord);
  }

  private mapRowToCommandRecord(row: any): CommandRecord {
    return {
      id: row.id,
      deviceId: row.device_id,
      commandType: row.command_type,
      payload: row.payload,
      idempotencyKey: row.idempotency_key,
      status: row.status,
      sentAt: row.sent_at,
      acknowledgedAt: row.acknowledged_at,
      responsePayload: row.response_payload,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    };
  }

  private async cacheCommand(command: CommandRecord): Promise<void> {
    const cacheKey = `${COMMAND_CACHE_PREFIX}${command.id}`;
    await redisClient.set(cacheKey, JSON.stringify(command), 3600);
  }

  private async getCachedCommand(commandId: string): Promise<CommandRecord | null> {
    const cacheKey = `${COMMAND_CACHE_PREFIX}${commandId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const commandService = new CommandService();
export default commandService;
