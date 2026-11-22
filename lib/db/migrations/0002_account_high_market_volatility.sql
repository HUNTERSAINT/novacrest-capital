-- Account-level High Market Volatility notice. Run this before deploying the updated API.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS high_market_volatility_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS high_market_volatility_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS high_market_volatility_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS high_market_volatility_admin_id integer;

-- Carry forward any existing active investment-level notices to the account.
UPDATE users u
SET high_market_volatility_active = true,
    high_market_volatility_applied_at = COALESCE(v.applied_at, now()),
    high_market_volatility_deadline = v.deadline,
    high_market_volatility_admin_id = v.admin_id
FROM (
  SELECT user_id,
         MAX(high_market_volatility_applied_at) AS applied_at,
         MAX(high_market_volatility_deadline) AS deadline,
         MAX(high_market_volatility_admin_id) AS admin_id
  FROM investments
  WHERE high_market_volatility_active = true
  GROUP BY user_id
) v
WHERE u.id = v.user_id;

-- Legacy investment flags are no longer used by the app.
UPDATE investments
SET high_market_volatility_active = false,
    high_market_volatility_applied_at = NULL,
    high_market_volatility_deadline = NULL,
    high_market_volatility_admin_id = NULL
WHERE high_market_volatility_active = true;
