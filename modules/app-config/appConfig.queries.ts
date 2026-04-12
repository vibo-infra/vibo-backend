export const LIST_ALL_APP_CONFIG = `
  SELECT config_key, value, updated_at
  FROM app_config
`;

export const GET_APP_CONFIG_KEY = `
  SELECT config_key, value, updated_at
  FROM app_config
  WHERE config_key = $1
`;
