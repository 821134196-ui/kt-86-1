import { Pool } from 'pg';
import { config, AggregationLevel } from '../config';
import { logger } from '../utils/logger';
import { TelemetryData, AggregatedTelemetry, ThresholdAlert } from '../types';

class TimescaleDB {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.timescaledbUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('TimescaleDB pool error', { error: err.message });
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS telemetry (
          time TIMESTAMPTZ NOT NULL,
          device_id TEXT NOT NULL,
          capability TEXT NOT NULL,
          value DOUBLE PRECISION NOT NULL
        );
      `);

      await this.pool.query(`
        SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE);
      `);

      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_telemetry_device_capability_time 
        ON telemetry (device_id, capability, time DESC);
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS telemetry_alerts (
          id SERIAL PRIMARY KEY,
          time TIMESTAMPTZ NOT NULL,
          device_id TEXT NOT NULL,
          capability TEXT NOT NULL,
          value DOUBLE PRECISION NOT NULL,
          threshold_type TEXT NOT NULL,
          threshold_value DOUBLE PRECISION NOT NULL,
          acknowledged BOOLEAN DEFAULT FALSE
        );
      `);

      await this.pool.query(`
        SELECT create_hypertable('telemetry_alerts', 'time', if_not_exists => TRUE);
      `);

      await this.createContinuousAggregates();

      logger.info('TimescaleDB initialized successfully');
    } catch (err) {
      logger.error('Failed to initialize TimescaleDB', { error: (err as Error).message });
      throw err;
    }
  }

  private async createContinuousAggregates(): Promise<void> {
    await this.pool.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1m
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 minute', time) AS bucket,
        device_id,
        capability,
        avg(value) AS avg,
        min(value) AS min,
        max(value) AS max,
        count(value) AS count,
        first(value, time) AS first,
        last(value, time) AS last
      FROM telemetry
      GROUP BY bucket, device_id, capability
      WITH NO DATA;
    `);

    await this.pool.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1h
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 hour', time) AS bucket,
        device_id,
        capability,
        avg(value) AS avg,
        min(value) AS min,
        max(value) AS max,
        count(value) AS count,
        first(value, time) AS first,
        last(value, time) AS last
      FROM telemetry
      GROUP BY bucket, device_id, capability
      WITH NO DATA;
    `);

    await this.pool.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1d
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 day', time) AS bucket,
        device_id,
        capability,
        avg(value) AS avg,
        min(value) AS min,
        max(value) AS max,
        count(value) AS count,
        first(value, time) AS first,
        last(value, time) AS last
      FROM telemetry
      GROUP BY bucket, device_id, capability
      WITH NO DATA;
    `);

    await this.pool.query(`
      SELECT add_continuous_aggregate_policy('telemetry_1m',
        start_offset => INTERVAL '3 hours',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute',
        if_not_exists => TRUE
      );
    `);

    await this.pool.query(`
      SELECT add_continuous_aggregate_policy('telemetry_1h',
        start_offset => INTERVAL '2 days',
        end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '1 hour',
        if_not_exists => TRUE
      );
    `);

    await this.pool.query(`
      SELECT add_continuous_aggregate_policy('telemetry_1d',
        start_offset => INTERVAL '30 days',
        end_offset => INTERVAL '1 day',
        schedule_interval => INTERVAL '1 day',
        if_not_exists => TRUE
      );
    `);

    await this.pool.query(`
      SELECT add_retention_policy('telemetry',
        INTERVAL '${config.aggregationRetention['1m']}',
        if_not_exists => TRUE
      );
    `);
  }

  async batchInsertTelemetry(data: TelemetryData[]): Promise<void> {
    if (data.length === 0) return;

    const values: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    data.forEach((item) => {
      values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
      params.push(item.timestamp, item.deviceId, item.capability, item.value);
      paramIndex += 4;
    });

    const query = `
      INSERT INTO telemetry (time, device_id, capability, value)
      VALUES ${values.join(', ')}
    `;

    await this.pool.query(query, params);
  }

  async queryTelemetry(
    deviceId: string,
    from: Date,
    to: Date,
    capability?: string,
    aggregation: AggregationLevel = 'raw'
  ): Promise<Array<Record<string, unknown>>> {
    let query: string;
    const params: unknown[] = [deviceId, from, to];

    if (aggregation === 'raw') {
      query = `
        SELECT time, device_id, capability, value
        FROM telemetry
        WHERE device_id = $1 AND time >= $2 AND time <= $3
        ${capability ? 'AND capability = $4' : ''}
        ORDER BY time ASC
      `;
      if (capability) params.push(capability);
    } else {
      const viewMap: Record<string, string> = {
        '1m': 'telemetry_1m',
        '1h': 'telemetry_1h',
        '1d': 'telemetry_1d',
      };
      const viewName = viewMap[aggregation];

      query = `
        SELECT bucket AS time, device_id, capability, avg, min, max, count, first, last
        FROM ${viewName}
        WHERE device_id = $1 AND bucket >= $2 AND bucket <= $3
        ${capability ? 'AND capability = $4' : ''}
        ORDER BY bucket ASC
      `;
      if (capability) params.push(capability);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async insertAlert(alert: Omit<ThresholdAlert, 'id'>): Promise<void> {
    await this.pool.query(
      `INSERT INTO telemetry_alerts (time, device_id, capability, value, threshold_type, threshold_value, acknowledged)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [alert.timestamp, alert.deviceId, alert.capability, alert.value, alert.thresholdType, alert.thresholdValue, alert.acknowledged]
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const timescaleDB = new TimescaleDB();
