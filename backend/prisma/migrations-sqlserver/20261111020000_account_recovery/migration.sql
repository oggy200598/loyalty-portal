ALTER TABLE dbo.users ADD auth_version int NOT NULL CONSTRAINT DF_users_auth_version DEFAULT 0;
CREATE TABLE dbo.password_reset_tokens (
 id uniqueidentifier NOT NULL PRIMARY KEY,
 user_id uniqueidentifier NOT NULL REFERENCES dbo.users(id),
 token_hash varchar(64) NOT NULL UNIQUE,
 expires_at datetime2 NOT NULL,
 used_at datetime2 NULL,
 created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 mail_payload nvarchar(max) NULL,
 mail_state varchar(20) NOT NULL DEFAULT 'PENDING',
 mail_attempts int NOT NULL DEFAULT 0,
 mail_next_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 mail_lease_at datetime2 NULL,
 CONSTRAINT CK_password_reset_mail_state CHECK (mail_state IN ('PENDING','SENDING','SENT','FAILED','CANCELLED'))
);
CREATE INDEX IX_password_reset_user_created ON dbo.password_reset_tokens(user_id,created_at);
CREATE INDEX IX_password_reset_delivery ON dbo.password_reset_tokens(mail_state,mail_next_at);
