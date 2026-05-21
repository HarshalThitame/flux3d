ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS status_timestamps jsonb NOT NULL DEFAULT jsonb_build_object('pending', now());

UPDATE public.orders
SET status_timestamps = jsonb_set(
  CASE
    WHEN jsonb_typeof(status_timestamps) = 'object' THEN status_timestamps
    ELSE '{}'::jsonb
  END,
  '{pending}',
  to_jsonb(COALESCE(created_at, now())::text),
  true
);

WITH status_events AS (
  SELECT
    target_id,
    new_value ->> 'status' AS status,
    MIN(performed_at) AS performed_at
  FROM public.admin_audit_logs
  WHERE action = 'update_order_status'
    AND target_type = 'order'
    AND new_value ? 'status'
    AND new_value ->> 'status' IN ('pending', 'confirmed', 'printing', 'shipped', 'delivered', 'completed', 'cancelled')
    AND performed_at IS NOT NULL
  GROUP BY target_id, new_value ->> 'status'
),
order_status_events AS (
  SELECT
    orders.id,
    jsonb_object_agg(status_events.status, status_events.performed_at::text) AS timestamps
  FROM public.orders
  JOIN status_events
    ON status_events.target_id = COALESCE(orders.group_id::text, orders.id::text)
    OR status_events.target_id = orders.id::text
  GROUP BY orders.id
)
UPDATE public.orders
SET status_timestamps = public.orders.status_timestamps || order_status_events.timestamps
FROM order_status_events
WHERE public.orders.id = order_status_events.id;

UPDATE public.orders
SET status_timestamps = jsonb_set(
  CASE
    WHEN jsonb_typeof(status_timestamps) = 'object' THEN status_timestamps
    ELSE '{}'::jsonb
  END,
  ARRAY[status],
  to_jsonb(COALESCE(updated_at, created_at, now())::text),
  true
)
WHERE status <> 'pending'
  AND COALESCE(status_timestamps ->> status, '') = '';
