import { db } from '../infrastructure/database';
import { Scene, SceneActionItem, CreateSceneInput, UpdateSceneInput } from '../types';
import { logger } from '../utils/logger';

function mapSceneRow(row: any, actions: SceneActionItem[] = []): Scene {
  return {
    id: row.id,
    homeId: row.home_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    isEnabled: row.is_enabled,
    sortOrder: row.sort_order,
    actions,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSceneActionRow(row: any): SceneActionItem {
  return {
    id: row.id,
    deviceId: row.device_id,
    actionType: row.action_type,
    payload: row.payload,
    delayMs: row.delay_ms,
    sortOrder: row.sort_order,
  };
}

export class SceneRepository {
  async findAll(homeId?: string, isEnabled?: boolean): Promise<Scene[]> {
    let query = `
      SELECT s.*, sa.id as sa_id, sa.device_id, sa.action_type, sa.payload, sa.delay_ms, sa.sort_order
      FROM scenes s
      LEFT JOIN scene_actions sa ON s.id = sa.scene_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (homeId) {
      query += ` AND s.home_id = $${paramIndex++}`;
      params.push(homeId);
    }
    if (isEnabled !== undefined) {
      query += ` AND s.is_enabled = $${paramIndex++}`;
      params.push(isEnabled);
    }

    query += ' ORDER BY s.sort_order ASC, s.created_at DESC';

    const result = await db.query(query, params);
    const sceneMap = new Map<string, { row: any; actions: SceneActionItem[] }>();

    for (const row of result.rows) {
      if (!sceneMap.has(row.id)) {
        sceneMap.set(row.id, { row, actions: [] });
      }
      if (row.sa_id) {
        sceneMap.get(row.id)!.actions.push(mapSceneActionRow(row));
      }
    }

    return Array.from(sceneMap.values()).map(({ row, actions }) =>
      mapSceneRow(row, actions.sort((a, b) => a.sortOrder - b.sortOrder))
    );
  }

  async findById(id: string): Promise<Scene | null> {
    const result = await db.query(
      `SELECT s.*, sa.id as sa_id, sa.device_id, sa.action_type, sa.payload, sa.delay_ms, sa.sort_order
       FROM scenes s
       LEFT JOIN scene_actions sa ON s.id = sa.scene_id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const actions = result.rows
      .filter((r) => r.sa_id)
      .map(mapSceneActionRow)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return mapSceneRow(result.rows[0], actions);
  }

  async create(input: CreateSceneInput): Promise<Scene> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const sceneResult = await client.query(
        `INSERT INTO scenes (
          home_id, name, description, icon, color, is_enabled, sort_order, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          input.homeId,
          input.name,
          input.description || null,
          input.icon || null,
          input.color || null,
          input.isEnabled !== undefined ? input.isEnabled : true,
          input.sortOrder || 0,
          input.createdBy || null,
        ]
      );

      const sceneId = sceneResult.rows[0].id;
      const actions: SceneActionItem[] = [];

      for (let i = 0; i < input.actions.length; i++) {
        const action = input.actions[i];
        const actionResult = await client.query(
          `INSERT INTO scene_actions (
            scene_id, device_id, action_type, payload, delay_ms, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [
            sceneId,
            action.deviceId,
            action.actionType,
            JSON.stringify(action.payload),
            action.delayMs || 0,
            action.sortOrder ?? i,
          ]
        );
        actions.push(mapSceneActionRow(actionResult.rows[0]));
      }

      await client.query('COMMIT');

      return mapSceneRow(sceneResult.rows[0], actions.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: string, input: UpdateSceneInput): Promise<Scene | null> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const fields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        params.push(input.name);
      }
      if (input.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        params.push(input.description);
      }
      if (input.icon !== undefined) {
        fields.push(`icon = $${paramIndex++}`);
        params.push(input.icon);
      }
      if (input.color !== undefined) {
        fields.push(`color = $${paramIndex++}`);
        params.push(input.color);
      }
      if (input.isEnabled !== undefined) {
        fields.push(`is_enabled = $${paramIndex++}`);
        params.push(input.isEnabled);
      }
      if (input.sortOrder !== undefined) {
        fields.push(`sort_order = $${paramIndex++}`);
        params.push(input.sortOrder);
      }

      let sceneResult;
      if (fields.length > 0) {
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);
        sceneResult = await client.query(
          `UPDATE scenes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
          params
        );
        if (sceneResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return null;
        }
      } else {
        sceneResult = await client.query('SELECT * FROM scenes WHERE id = $1', [id]);
        if (sceneResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return null;
        }
      }

      let actions: SceneActionItem[] = [];
      if (input.actions !== undefined) {
        await client.query('DELETE FROM scene_actions WHERE scene_id = $1', [id]);

        for (let i = 0; i < input.actions.length; i++) {
          const action = input.actions[i];
          const actionResult = await client.query(
            `INSERT INTO scene_actions (
              scene_id, device_id, action_type, payload, delay_ms, sort_order
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
              id,
              action.deviceId,
              action.actionType,
              JSON.stringify(action.payload),
              action.delayMs || 0,
              action.sortOrder ?? i,
            ]
          );
          actions.push(mapSceneActionRow(actionResult.rows[0]));
        }
      } else {
        const existingActionsResult = await client.query(
          'SELECT * FROM scene_actions WHERE scene_id = $1 ORDER BY sort_order',
          [id]
        );
        actions = existingActionsResult.rows.map(mapSceneActionRow);
      }

      await client.query('COMMIT');

      return mapSceneRow(sceneResult.rows[0], actions.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.query('DELETE FROM scenes WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }
}

export const sceneRepository = new SceneRepository();
