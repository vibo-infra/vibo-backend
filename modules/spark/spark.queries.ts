export const INSERT_SPARK_WALLET = `
  INSERT INTO spark_wallet (user_id, balance)
  VALUES (
    $1,
    COALESCE(
      (SELECT GREATEST(u.spark_balance::bigint, 0) FROM users u WHERE u.user_id = $1),
      0
    )
  )
  ON CONFLICT (user_id) DO NOTHING
`;

export const LOCK_SPARK_WALLET = `
  SELECT user_id, balance, updated_at
  FROM spark_wallet
  WHERE user_id = $1
  FOR UPDATE
`;

export const UPDATE_SPARK_WALLET_BALANCE = `
  UPDATE spark_wallet
  SET balance = $2, updated_at = NOW()
  WHERE user_id = $1
  RETURNING user_id, balance
`;

export const INSERT_SPARK_TRANSACTION = `
  INSERT INTO spark_transaction (
    user_id, amount, balance_after, reason, reference_type, reference_id, metadata
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING transaction_id, created_at
`;

export const UPDATE_SPARK_TRANSACTION_REFERENCE = `
  UPDATE spark_transaction
  SET reference_type = $2, reference_id = $3
  WHERE transaction_id = $1 AND user_id = $4
  RETURNING transaction_id
`;

export const SYNC_USERS_SPARK_BALANCE = `
  UPDATE users
  SET spark_balance = $2, updated_at = NOW()
  WHERE user_id = $1
`;

export const LIST_SPARK_TRANSACTIONS = `
  SELECT
    transaction_id,
    user_id,
    amount,
    balance_after,
    reason,
    reference_type,
    reference_id,
    metadata,
    created_at
  FROM spark_transaction
  WHERE user_id = $1
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3
`;

export const GET_SPARK_BALANCE = `
  SELECT COALESCE(w.balance, u.spark_balance, 0)::bigint AS balance
  FROM users u
  LEFT JOIN spark_wallet w ON w.user_id = u.user_id
  WHERE u.user_id = $1
`;

/** When there is no ledger yet, merge legacy `users.spark_balance` into the wallet (both may be non-zero). */
export const REALIGN_SPARK_WALLET_WITH_USERS_IF_NO_LEDGER = `
  UPDATE spark_wallet w
  SET
    balance = GREATEST(w.balance, u.spark_balance::bigint),
    updated_at = NOW()
  FROM users u
  WHERE w.user_id = u.user_id
    AND u.user_id = $1
    AND NOT EXISTS (SELECT 1 FROM spark_transaction t WHERE t.user_id = $1)
`;

/** Keep `users.spark_balance` as a mirror of `spark_wallet.balance` (clamped to int). */
export const MIRROR_USERS_SPARK_FROM_WALLET = `
  UPDATE users u
  SET
    spark_balance = (
      CASE
        WHEN w.balance > 2147483647 THEN 2147483647
        ELSE w.balance
      END
    )::integer,
    updated_at = NOW()
  FROM spark_wallet w
  WHERE w.user_id = u.user_id
    AND u.user_id = $1
`;
