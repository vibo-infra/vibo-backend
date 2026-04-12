import { pool } from '../../core/database/client';
import { GET_APP_CONFIG_KEY, LIST_ALL_APP_CONFIG } from './appConfig.queries';

export type AppConfigRow = {
  config_key: string;
  value: unknown;
  updated_at: Date;
};

export const listAllConfigRows = async (): Promise<AppConfigRow[]> => {
  const { rows } = await pool.query(LIST_ALL_APP_CONFIG);
  return rows as AppConfigRow[];
};

export const getConfigValueByKey = async (configKey: string): Promise<unknown | null> => {
  const { rows } = await pool.query(GET_APP_CONFIG_KEY, [configKey]);
  const row = rows[0] as { value?: unknown } | undefined;
  return row?.value ?? null;
};
