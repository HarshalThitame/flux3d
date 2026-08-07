-- ============================================================================
-- Guarded SKU deletion — can_delete_sku RPC
-- Blocks deleting a SKU that is entangled with orders:
--   * has active/converted inventory reservations (order in progress), or
--   * appears in the items JSONB snapshot of any non-cancelled shelf_order.
-- Returns a human-readable reason so the admin UI can guide the user to
-- mark the SKU unavailable instead.
-- ============================================================================

-- Speed up the items containment check used by can_delete_sku.
CREATE INDEX IF NOT EXISTS idx_shelf_orders_items_gin
  ON public.shelf_orders USING GIN (items);

CREATE OR REPLACE FUNCTION public.can_delete_sku(p_sku_id UUID)
RETURNS TABLE(
  can_delete BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_reservations BOOLEAN;
  v_order_history BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.inventory_reservations
    WHERE sku_id = p_sku_id
      AND status IN ('active', 'converted')
  ) INTO v_active_reservations;

  IF v_active_reservations THEN
    can_delete := false;
    reason := 'This SKU has active inventory reservations. Set it to unavailable instead.';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.shelf_orders
    WHERE order_status <> 'cancelled'
      AND items @> jsonb_build_array(jsonb_build_object('sku_id', p_sku_id))
  ) INTO v_order_history;

  IF v_order_history THEN
    can_delete := false;
    reason := 'This SKU appears in completed orders. Set it to unavailable instead.';
    RETURN NEXT;
    RETURN;
  END IF;

  can_delete := true;
  reason := NULL;
  RETURN NEXT;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_delete_sku(UUID) TO service_role;
