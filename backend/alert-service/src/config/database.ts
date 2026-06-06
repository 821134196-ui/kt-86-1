import { Pool } from 'pg';
import { config } from './index';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }
  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
