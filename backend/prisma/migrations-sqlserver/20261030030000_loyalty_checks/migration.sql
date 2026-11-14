ALTER TABLE dbo.loyalty_rule_versions ADD CONSTRAINT ck_loyalty_rule_status CHECK (status IN ('DRAFT','SUBMITTED','PUBLISHED'));
ALTER TABLE dbo.loyalty_complaints ADD CONSTRAINT ck_loyalty_complaint_status CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED','REJECTED'));
ALTER TABLE dbo.loyalty_adjustments ADD CONSTRAINT ck_loyalty_adjustment_status CHECK (status IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE dbo.loyalty_point_transactions ADD CONSTRAINT ck_loyalty_transaction_kind CHECK (kind IN ('EARN','REDEEM','ADJUSTMENT','EXPIRE','REVERSAL'));
ALTER TABLE dbo.loyalty_members ADD CONSTRAINT ck_loyalty_qualifying_spend CHECK (qualifying_spend>=0);
ALTER TABLE dbo.loyalty_rewards ADD CONSTRAINT ck_loyalty_tier_minimum CHECK (minimum_tier_spend>=0);
