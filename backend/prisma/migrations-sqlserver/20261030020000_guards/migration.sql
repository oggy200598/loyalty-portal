ALTER TABLE dbo.[categories] ADD CONSTRAINT [ck_categories_status] CHECK ([status] IN (N'ACTIVE',N'INACTIVE'));
ALTER TABLE dbo.[coupons] ADD CONSTRAINT [ck_coupons_discount_type] CHECK ([discount_type] IN (N'PERCENT',N'FIXED',N'FREE_SHIP'));
ALTER TABLE dbo.[coupons] ADD CONSTRAINT [ck_coupons_status] CHECK ([status] IN (N'ACTIVE',N'INACTIVE',N'EXPIRED'));
ALTER TABLE dbo.[ml_training_runs] ADD CONSTRAINT [ck_ml_training_runs_status] CHECK ([status] IN (N'RUNNING',N'SUCCESS',N'FAILED'));
ALTER TABLE dbo.[notifications] ADD CONSTRAINT [ck_notifications_type] CHECK ([type] IN (N'ORDER_UPDATE',N'RISK_ALERT',N'PROMOTION',N'SYSTEM'));
ALTER TABLE dbo.[order_status_history] ADD CONSTRAINT [ck_order_status_history_old_status] CHECK ([old_status] IN (N'PENDING',N'CONFIRMED',N'PROCESSING',N'SHIPPING',N'DELIVERED',N'COMPLETED',N'CANCELLED',N'RETURNED',N'FAILED',N'NON_RECEIVED'));
ALTER TABLE dbo.[order_status_history] ADD CONSTRAINT [ck_order_status_history_new_status] CHECK ([new_status] IN (N'PENDING',N'CONFIRMED',N'PROCESSING',N'SHIPPING',N'DELIVERED',N'COMPLETED',N'CANCELLED',N'RETURNED',N'FAILED',N'NON_RECEIVED'));
ALTER TABLE dbo.[orders] ADD CONSTRAINT [ck_orders_status] CHECK ([status] IN (N'PENDING',N'CONFIRMED',N'PROCESSING',N'SHIPPING',N'DELIVERED',N'COMPLETED',N'CANCELLED',N'RETURNED',N'FAILED',N'NON_RECEIVED'));
ALTER TABLE dbo.[orders] ADD CONSTRAINT [ck_orders_payment_status] CHECK ([payment_status] IN (N'UNPAID',N'PAID',N'PARTIALLY_REFUNDED',N'REFUNDED',N'FAILED'));
ALTER TABLE dbo.[payments] ADD CONSTRAINT [ck_payments_method] CHECK ([method] IN (N'COD',N'BANK_TRANSFER',N'CREDIT_CARD',N'E_WALLET'));
ALTER TABLE dbo.[payments] ADD CONSTRAINT [ck_payments_status] CHECK ([status] IN (N'UNPAID',N'PAID',N'PARTIALLY_REFUNDED',N'REFUNDED',N'FAILED'));
ALTER TABLE dbo.[products] ADD CONSTRAINT [ck_products_status] CHECK ([status] IN (N'ACTIVE',N'OUT_OF_STOCK',N'HIDDEN',N'DELETED'));
ALTER TABLE dbo.[recommendation_actions] ADD CONSTRAINT [ck_recommendation_actions_decision] CHECK ([decision] IN (N'IGNORED',N'CANCELLED',N'REQUIRE_PREPAYMENT',N'BLOCKED_BUYER',N'CONTACTED_BUYER'));
ALTER TABLE dbo.[recommendations] ADD CONSTRAINT [ck_recommendations_action_type] CHECK ([action_type] IN (N'REQUIRE_PREPAYMENT',N'FLAG_FOR_REVIEW',N'LIMIT_COD',N'BLOCK_BUYER',N'SEND_WARNING',N'NO_ACTION'));
ALTER TABLE dbo.[returns] ADD CONSTRAINT [ck_returns_status] CHECK ([status] IN (N'REQUESTED',N'APPROVED',N'REJECTED',N'COMPLETED'));
ALTER TABLE dbo.[risk_explanations] ADD CONSTRAINT [ck_risk_explanations_impact_direction] CHECK ([impact_direction] IN (N'POSITIVE',N'NEGATIVE',N'NEUTRAL'));
ALTER TABLE dbo.[risk_predictions] ADD CONSTRAINT [ck_risk_predictions_risk_level] CHECK ([risk_level] IN (N'LOW',N'MEDIUM',N'HIGH',N'CRITICAL'));
ALTER TABLE dbo.[shipments] ADD CONSTRAINT [ck_shipments_status] CHECK ([status] IN (N'PENDING',N'PICKED_UP',N'IN_TRANSIT',N'DELIVERED',N'FAILED_DELIVERY',N'RETURNED_TO_SHOP'));
ALTER TABLE dbo.[shops] ADD CONSTRAINT [ck_shops_status] CHECK ([status] IN (N'ACTIVE',N'SUSPENDED',N'CLOSED'));
ALTER TABLE dbo.[users] ADD CONSTRAINT [ck_users_status] CHECK ([status] IN (N'ACTIVE',N'SUSPENDED',N'DELETED'));
ALTER TABLE dbo.[loyalty_rule_versions] DROP CONSTRAINT [loyalty_rule_versions_effective_at_key];
CREATE UNIQUE INDEX [loyalty_rule_versions_effective_at_key] ON dbo.[loyalty_rule_versions]([effective_at]) WHERE [effective_at] IS NOT NULL;
ALTER TABLE dbo.[payment_attempts] DROP CONSTRAINT [payment_attempts_provider_transaction_key];
CREATE UNIQUE INDEX [payment_attempts_provider_transaction_key] ON dbo.[payment_attempts]([provider_transaction]) WHERE [provider_transaction] IS NOT NULL;
CREATE UNIQUE INDEX uq_addresses_default ON dbo.addresses(user_id) WHERE is_default=1;
CREATE UNIQUE INDEX uq_product_images_primary ON dbo.product_images(product_id) WHERE is_primary=1;
CREATE UNIQUE INDEX uq_ml_models_active_per_name ON dbo.ml_models(model_name) WHERE is_active=1;
ALTER TABLE dbo.loyalty_rule_versions ADD CONSTRAINT ck_loyalty_config_json CHECK (ISJSON(config)=1);
ALTER TABLE dbo.audit_logs ADD CONSTRAINT ck_audit_json CHECK ((old_data IS NULL OR ISJSON(old_data)=1) AND (new_data IS NULL OR ISJSON(new_data)=1));
ALTER TABLE dbo.loyalty_point_lots ADD CONSTRAINT ck_lots_remaining CHECK (remaining>=0);
ALTER TABLE dbo.loyalty_rewards ADD CONSTRAINT ck_rewards_valid CHECK (points_cost>0 AND stock>=0 AND discount_value>0 AND min_order_value>=0 AND voucher_days BETWEEN 1 AND 365);
ALTER TABLE dbo.loyalty_adjustments ADD CONSTRAINT ck_adjustment_valid CHECK (points<>0 AND points BETWEEN -1000000 AND 1000000 AND (decided_by IS NULL OR decided_by<>requested_by));
ALTER TABLE dbo.payment_attempts ADD CONSTRAINT ck_payment_attempt CHECK (amount>0 AND status IN ('PENDING','PAID','FAILED') AND provider IN ('VNPAY','MOMO') AND (status<>'PAID' OR (paid_at IS NOT NULL AND provider_transaction IS NOT NULL)));
GO
CREATE TRIGGER dbo.trg_loyalty_immutable_ledger ON dbo.loyalty_point_transactions AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; THROW 51001, 'Loyalty ledger is append-only', 1; END;
GO
CREATE TRIGGER dbo.trg_loyalty_immutable_rule ON dbo.loyalty_rule_versions AFTER UPDATE,DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM deleted WHERE status='PUBLISHED') THROW 51002, 'Published loyalty rules are immutable', 1; END;
GO
