-- Apply once before deploying the shared lifecycle handlers.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS inventory_released boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_key uuid UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at timestamp;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_evidence_url text;
UPDATE orders SET delivered_at = history.delivered_at FROM (SELECT order_id, MAX(changed_at) AS delivered_at FROM order_status_history WHERE status = 'delivered' GROUP BY order_id) history WHERE history.order_id = orders.id AND orders.delivered_at IS NULL;
-- Historical failed payments/cancellations were released by the previous code.
UPDATE orders SET inventory_released = true WHERE status = 'cancelled' OR payment_status = 'failed' OR return_status = 'approved';
