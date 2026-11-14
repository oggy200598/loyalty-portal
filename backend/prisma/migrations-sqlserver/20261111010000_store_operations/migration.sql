ALTER TABLE dbo.addresses ADD version int NOT NULL CONSTRAINT DF_addresses_version DEFAULT 1;
GO
-- Retain one existing default where possible; otherwise choose the oldest address.
WITH ranked AS (
 SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY is_default DESC,id ASC) AS rn
 FROM dbo.addresses
)
UPDATE a SET is_default=CASE WHEN r.rn=1 THEN 1 ELSE 0 END, version=version+1
FROM dbo.addresses a JOIN ranked r ON r.id=a.id
WHERE a.is_default<>CASE WHEN r.rn=1 THEN 1 ELSE 0 END;
CREATE UNIQUE INDEX UX_addresses_one_default ON dbo.addresses(user_id) WHERE is_default=1;
GO
CREATE TABLE dbo.system_settings (
  id int NOT NULL CONSTRAINT PK_system_settings PRIMARY KEY CONSTRAINT CK_system_settings_singleton CHECK (id=1),
  store_name nvarchar(150) NOT NULL,
  support_email nvarchar(255) NOT NULL,
  support_phone nvarchar(20) NOT NULL,
  store_address nvarchar(500) NOT NULL,
  shipping_fee decimal(15,2) NOT NULL CONSTRAINT CK_settings_fee CHECK (shipping_fee>=0),
  free_shipping_threshold decimal(15,2) NOT NULL CONSTRAINT CK_settings_threshold CHECK (free_shipping_threshold>=0),
  version int NOT NULL CONSTRAINT DF_settings_version DEFAULT 1,
  updated_at datetime2 NOT NULL CONSTRAINT DF_settings_updated DEFAULT SYSUTCDATETIME()
);
INSERT dbo.system_settings(id,store_name,support_email,support_phone,store_address,shipping_fee,free_shipping_threshold)
VALUES(1,N'RiskMind',N'',N'',N'',25000,500000);
