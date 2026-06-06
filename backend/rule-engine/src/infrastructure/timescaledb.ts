import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

class TimescaleDB {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.timescaledbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on TimescaleDB idle client', { error: err.message });
    });
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed TimescaleDB query', { duration, rows: result.rowCount });
      return result;
    } catch (error: any) {
      logger.error('TimescaleDB query error', { error: error.message });
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

export const timescaleDb = new TimescaleDB();
