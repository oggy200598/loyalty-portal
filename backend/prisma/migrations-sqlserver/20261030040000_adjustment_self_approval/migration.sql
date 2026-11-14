-- Admins can decide their own requests; retain point bounds and audit fields.
ALTER TABLE dbo.loyalty_adjustments DROP CONSTRAINT ck_adjustment_valid;
ALTER TABLE dbo.loyalty_adjustments WITH CHECK ADD CONSTRAINT ck_adjustment_valid
CHECK (points<>0 AND points BETWEEN -1000000 AND 1000000);
