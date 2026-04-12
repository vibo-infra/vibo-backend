import { pool } from '../../core/database/client';
import { LIST_ALL_APP_CONFIG } from './appConfig.queries';

export type AppConfigRow = {
  config_key: string;
  value: unknown;
  updated_at: Date;
};

export const listAllConfigRows = async (): Promise<AppConfigRow[]> => {
  const { rows } = await pool.query(LIST_ALL_APP_CONFIG);
  return rows as AppConfigRow[];
};
