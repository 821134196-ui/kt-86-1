import { Pool } from 'pg';
import { config } from '../config';
import logger from '../utils/logger';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Executed query in ${duration}ms: ${text}`);
      return res;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  async getClient() {
    return this.pool.connect();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  async close() {
    await this.pool.end();
  }
}

export const db = new Database();
export default db;
