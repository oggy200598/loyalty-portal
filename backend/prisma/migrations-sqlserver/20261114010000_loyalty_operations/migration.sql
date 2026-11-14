IF COL_LENGTH('dbo.loyalty_adjustments', 'request_key') IS NULL
  ALTER TABLE dbo.loyalty_adjustments ADD request_key uniqueidentifier NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_loyalty_adjustments_request_key' AND object_id = OBJECT_ID('dbo.loyalty_adjustments'))
  CREATE UNIQUE INDEX ux_loyalty_adjustments_request_key
  ON dbo.loyalty_adjustments(request_key) WHERE request_key IS NOT NULL;
