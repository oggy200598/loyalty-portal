BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[addresses] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [receiver_name] NVARCHAR(255) NOT NULL,
    [phone] NVARCHAR(20) NOT NULL,
    [province] NVARCHAR(100) NOT NULL,
    [district] NVARCHAR(100) NOT NULL,
    [ward] NVARCHAR(100) NOT NULL,
    [address_detail] NVARCHAR(max) NOT NULL,
    [is_default] BIT NOT NULL CONSTRAINT [addresses_is_default_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [addresses_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [addresses_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [user_id] UNIQUEIDENTIFIER,
    [action] NVARCHAR(100) NOT NULL,
    [entity_type] NVARCHAR(100) NOT NULL,
    [entity_id] BIGINT,
    [old_data] NVARCHAR(max),
    [new_data] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [audit_logs_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[buyer_features] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [buyer_id] UNIQUEIDENTIFIER NOT NULL,
    [feature_date] DATE NOT NULL,
    [cancel_rate] DECIMAL(8,5) NOT NULL CONSTRAINT [buyer_features_cancel_rate_df] DEFAULT 0,
    [return_rate] DECIMAL(8,5) NOT NULL CONSTRAINT [buyer_features_return_rate_df] DEFAULT 0,
    [failure_rate] DECIMAL(8,5) NOT NULL CONSTRAINT [buyer_features_failure_rate_df] DEFAULT 0,
    [non_receive_rate] DECIMAL(8,5) NOT NULL CONSTRAINT [buyer_features_non_receive_rate_df] DEFAULT 0,
    [total_order_value] DECIMAL(15,2) NOT NULL CONSTRAINT [buyer_features_total_order_value_df] DEFAULT 0,
    [average_order_value] DECIMAL(15,2) NOT NULL CONSTRAINT [buyer_features_average_order_value_df] DEFAULT 0,
    [orders_last_7_days] INT NOT NULL CONSTRAINT [buyer_features_orders_last_7_days_df] DEFAULT 0,
    [orders_last_30_days] INT NOT NULL CONSTRAINT [buyer_features_orders_last_30_days_df] DEFAULT 0,
    [avg_order_interval] DECIMAL(10,2) NOT NULL CONSTRAINT [buyer_features_avg_order_interval_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [buyer_features_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [buyer_features_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [buyer_features_buyer_id_feature_date_key] UNIQUE NONCLUSTERED ([buyer_id],[feature_date])
);

-- CreateTable
CREATE TABLE [dbo].[buyer_profiles] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [buyer_id] UNIQUEIDENTIFIER NOT NULL,
    [total_orders] INT NOT NULL CONSTRAINT [buyer_profiles_total_orders_df] DEFAULT 0,
    [completed_orders] INT NOT NULL CONSTRAINT [buyer_profiles_completed_orders_df] DEFAULT 0,
    [cancelled_orders] INT NOT NULL CONSTRAINT [buyer_profiles_cancelled_orders_df] DEFAULT 0,
    [returned_orders] INT NOT NULL CONSTRAINT [buyer_profiles_returned_orders_df] DEFAULT 0,
    [failed_orders] INT NOT NULL CONSTRAINT [buyer_profiles_failed_orders_df] DEFAULT 0,
    [non_received_orders] INT NOT NULL CONSTRAINT [buyer_profiles_non_received_orders_df] DEFAULT 0,
    [total_spent] DECIMAL(15,2) NOT NULL CONSTRAINT [buyer_profiles_total_spent_df] DEFAULT 0,
    [average_order_value] DECIMAL(15,2) NOT NULL CONSTRAINT [buyer_profiles_average_order_value_df] DEFAULT 0,
    [first_order_at] DATETIME2,
    [last_order_at] DATETIME2,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [buyer_profiles_updated_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [buyer_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [buyer_profiles_buyer_id_key] UNIQUE NONCLUSTERED ([buyer_id])
);

-- CreateTable
CREATE TABLE [dbo].[cart_items] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [cart_id] BIGINT NOT NULL,
    [product_id] BIGINT NOT NULL,
    [variant_id] BIGINT,
    [quantity] INT NOT NULL CONSTRAINT [cart_items_quantity_df] DEFAULT 1,
    [price] DECIMAL(15,2) NOT NULL,
    CONSTRAINT [cart_items_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uq_cart_variant] UNIQUE NONCLUSTERED ([cart_id],[product_id],[variant_id])
);

-- CreateTable
CREATE TABLE [dbo].[carts] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [carts_created_at_df] DEFAULT sysutcdatetime(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [carts_updated_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [carts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uq_carts_user_id] UNIQUE NONCLUSTERED ([user_id])
);

-- CreateTable
CREATE TABLE [dbo].[categories] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [parent_id] BIGINT,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [categories_status_df] DEFAULT 'ACTIVE',
    CONSTRAINT [categories_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[coupon_categories] (
    [coupon_id] BIGINT NOT NULL,
    [category_id] BIGINT NOT NULL,
    CONSTRAINT [coupon_categories_pkey] PRIMARY KEY CLUSTERED ([coupon_id],[category_id])
);

-- CreateTable
CREATE TABLE [dbo].[coupons] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [discount_type] NVARCHAR(40) NOT NULL,
    [discount_value] DECIMAL(15,2) NOT NULL CONSTRAINT [coupons_discount_value_df] DEFAULT 0,
    [min_order_value] DECIMAL(15,2) NOT NULL CONSTRAINT [coupons_min_order_value_df] DEFAULT 0,
    [max_discount] DECIMAL(15,2),
    [usage_limit] INT,
    [used_count] INT NOT NULL CONSTRAINT [coupons_used_count_df] DEFAULT 0,
    [start_at] DATETIME2 NOT NULL,
    [end_at] DATETIME2 NOT NULL,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [coupons_status_df] DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [coupons_created_at_df] DEFAULT sysutcdatetime(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [coupons_updated_at_df] DEFAULT sysutcdatetime(),
    [loyalty_owner_id] UNIQUEIDENTIFIER,
    CONSTRAINT [coupons_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [coupons_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[ml_models] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [model_name] NVARCHAR(100) NOT NULL,
    [algorithm] NVARCHAR(100) NOT NULL,
    [version] NVARCHAR(50) NOT NULL,
    [accuracy] DECIMAL(8,5),
    [precision_score] DECIMAL(8,5),
    [recall_score] DECIMAL(8,5),
    [f1_score] DECIMAL(8,5),
    [roc_auc] DECIMAL(8,5),
    [model_path] NVARCHAR(max),
    [is_active] BIT NOT NULL CONSTRAINT [ml_models_is_active_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ml_models_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [ml_models_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ml_models_model_name_version_key] UNIQUE NONCLUSTERED ([model_name],[version])
);

-- CreateTable
CREATE TABLE [dbo].[ml_training_runs] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [model_id] BIGINT NOT NULL,
    [dataset_version] NVARCHAR(100),
    [feature_date_from] DATE,
    [feature_date_to] DATE,
    [training_samples] INT,
    [testing_samples] INT,
    [started_at] DATETIME2,
    [completed_at] DATETIME2,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [ml_training_runs_status_df] DEFAULT 'RUNNING',
    CONSTRAINT [ml_training_runs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[notifications] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [message] NVARCHAR(max) NOT NULL,
    [type] NVARCHAR(40) NOT NULL,
    [reference_type] NVARCHAR(50),
    [reference_id] BIGINT,
    [is_read] BIT NOT NULL CONSTRAINT [notifications_is_read_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [notifications_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[order_items] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [order_id] BIGINT NOT NULL,
    [product_id] BIGINT NOT NULL,
    [variant_id] BIGINT,
    [product_name] NVARCHAR(255) NOT NULL,
    [quantity] INT NOT NULL,
    [unit_price] DECIMAL(15,2) NOT NULL,
    [subtotal] DECIMAL(15,2) NOT NULL,
    CONSTRAINT [order_items_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[order_status_history] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [order_id] BIGINT NOT NULL,
    [old_status] NVARCHAR(40),
    [new_status] NVARCHAR(40) NOT NULL,
    [changed_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [order_status_history_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [order_status_history_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[orders] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [order_code] NVARCHAR(50) NOT NULL,
    [buyer_id] UNIQUEIDENTIFIER NOT NULL,
    [shop_id] BIGINT NOT NULL,
    [shipping_address_id] BIGINT,
    [shipping_receiver_name] NVARCHAR(255) NOT NULL,
    [shipping_phone] NVARCHAR(20) NOT NULL,
    [shipping_province] NVARCHAR(100) NOT NULL,
    [shipping_district] NVARCHAR(100) NOT NULL,
    [shipping_ward] NVARCHAR(100) NOT NULL,
    [shipping_address_detail] NVARCHAR(max) NOT NULL,
    [note] NVARCHAR(max),
    [inventory_reserved] BIT NOT NULL CONSTRAINT [orders_inventory_reserved_df] DEFAULT 0,
    [subtotal] DECIMAL(15,2) NOT NULL,
    [shipping_fee] DECIMAL(15,2) NOT NULL CONSTRAINT [orders_shipping_fee_df] DEFAULT 0,
    [discount_amount] DECIMAL(15,2) NOT NULL CONSTRAINT [orders_discount_amount_df] DEFAULT 0,
    [total_amount] DECIMAL(15,2) NOT NULL,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [orders_status_df] DEFAULT 'PENDING',
    [payment_status] NVARCHAR(40) NOT NULL CONSTRAINT [orders_payment_status_df] DEFAULT 'UNPAID',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [orders_created_at_df] DEFAULT sysutcdatetime(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [orders_updated_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [orders_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [orders_order_code_key] UNIQUE NONCLUSTERED ([order_code])
);

-- CreateTable
CREATE TABLE [dbo].[payments] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [order_id] BIGINT NOT NULL,
    [method] NVARCHAR(40) NOT NULL,
    [amount] DECIMAL(15,2) NOT NULL,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [payments_status_df] DEFAULT 'UNPAID',
    [transaction_code] NVARCHAR(100),
    [paid_at] DATETIME2,
    CONSTRAINT [payments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_images] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [product_id] BIGINT NOT NULL,
    [image_url] NVARCHAR(max) NOT NULL,
    [is_primary] BIT NOT NULL CONSTRAINT [product_images_is_primary_df] DEFAULT 0,
    CONSTRAINT [product_images_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_variants] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [product_id] BIGINT NOT NULL,
    [variant_name] NVARCHAR(255) NOT NULL,
    [price] DECIMAL(15,2) NOT NULL,
    [stock_quantity] INT NOT NULL CONSTRAINT [product_variants_stock_quantity_df] DEFAULT 0,
    CONSTRAINT [product_variants_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[products] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [shop_id] BIGINT NOT NULL,
    [category_id] BIGINT,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [price] DECIMAL(15,2) NOT NULL,
    [stock_quantity] INT NOT NULL CONSTRAINT [products_stock_quantity_df] DEFAULT 0,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [products_status_df] DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [products_created_at_df] DEFAULT sysutcdatetime(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [products_updated_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [products_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[recommendation_actions] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [recommendation_id] BIGINT NOT NULL,
    [seller_id] UNIQUEIDENTIFIER NOT NULL,
    [decision] NVARCHAR(40) NOT NULL,
    [note] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [recommendation_actions_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [recommendation_actions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[recommendations] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [prediction_id] BIGINT NOT NULL,
    [action_type] NVARCHAR(40) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [recommendations_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [recommendations_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[returns] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [order_id] BIGINT NOT NULL,
    [reason] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [returns_status_df] DEFAULT 'REQUESTED',
    [requested_at] DATETIME2 NOT NULL CONSTRAINT [returns_requested_at_df] DEFAULT sysutcdatetime(),
    [processed_at] DATETIME2,
    CONSTRAINT [returns_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[reviews] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [order_id] BIGINT NOT NULL,
    [product_id] BIGINT NOT NULL,
    [buyer_id] UNIQUEIDENTIFIER NOT NULL,
    [rating] INT NOT NULL,
    [comment] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [reviews_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [reviews_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [reviews_order_id_product_id_buyer_id_key] UNIQUE NONCLUSTERED ([order_id],[product_id],[buyer_id])
);

-- CreateTable
CREATE TABLE [dbo].[risk_explanations] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [prediction_id] BIGINT NOT NULL,
    [feature_name] NVARCHAR(100) NOT NULL,
    [feature_value] DECIMAL(15,5),
    [impact_value] DECIMAL(15,5),
    [impact_direction] NVARCHAR(40),
    [description] NVARCHAR(max),
    CONSTRAINT [risk_explanations_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[risk_predictions] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [buyer_id] UNIQUEIDENTIFIER NOT NULL,
    [order_id] BIGINT,
    [model_id] BIGINT NOT NULL,
    [risk_probability] DECIMAL(8,5) NOT NULL,
    [risk_score] DECIMAL(5,2) NOT NULL,
    [risk_level] NVARCHAR(40) NOT NULL,
    [predicted_at] DATETIME2 NOT NULL CONSTRAINT [risk_predictions_predicted_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [risk_predictions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[roles] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(50) NOT NULL,
    CONSTRAINT [roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [roles_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[shipments] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [order_id] BIGINT NOT NULL,
    [carrier] NVARCHAR(100) NOT NULL,
    [tracking_code] NVARCHAR(100),
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [shipments_status_df] DEFAULT 'PENDING',
    [shipped_at] DATETIME2,
    [delivered_at] DATETIME2,
    CONSTRAINT [shipments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[shop_members] (
    [shop_id] BIGINT NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [role] NVARCHAR(50) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [shop_members_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [shop_members_pkey] PRIMARY KEY CLUSTERED ([shop_id],[user_id])
);

-- CreateTable
CREATE TABLE [dbo].[shops] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [owner_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [logo_url] NVARCHAR(max),
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [shops_status_df] DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [shops_created_at_df] DEFAULT sysutcdatetime(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [shops_updated_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [shops_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[user_roles] (
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [role_id] BIGINT NOT NULL,
    CONSTRAINT [user_roles_pkey] PRIMARY KEY CLUSTERED ([user_id],[role_id])
);

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [users_id_df] DEFAULT newid(),
    [email] NVARCHAR(255) NOT NULL,
    [password_hash] NVARCHAR(255) NOT NULL,
    [token_version] INT NOT NULL CONSTRAINT [users_token_version_df] DEFAULT 0,
    [full_name] NVARCHAR(255),
    [phone] NVARCHAR(20),
    [avatar_url] NVARCHAR(max),
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [users_status_df] DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT sysutcdatetime(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [users_updated_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[loyalty_members] (
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [balance] INT NOT NULL CONSTRAINT [loyalty_members_balance_df] DEFAULT 0,
    [qualifying_spend] DECIMAL(15,2) NOT NULL CONSTRAINT [loyalty_members_qualifying_spend_df] DEFAULT 0,
    [tier_code] NVARCHAR(30) NOT NULL CONSTRAINT [loyalty_members_tier_code_df] DEFAULT 'BRONZE',
    [cycle_started_at] DATETIME2 NOT NULL CONSTRAINT [loyalty_members_cycle_started_at_df] DEFAULT sysutcdatetime(),
    [joined_at] DATETIME2 NOT NULL CONSTRAINT [loyalty_members_joined_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [loyalty_members_pkey] PRIMARY KEY CLUSTERED ([user_id])
);

-- CreateTable
CREATE TABLE [dbo].[loyalty_rule_versions] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(150) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [loyalty_rule_versions_status_df] DEFAULT 'DRAFT',
    [config] NVARCHAR(max) NOT NULL,
    [effective_at] DATETIME2,
    [created_by] UNIQUEIDENTIFIER,
    [published_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [loyalty_rule_versions_created_at_df] DEFAULT sysutcdatetime(),
    [published_at] DATETIME2,
    CONSTRAINT [loyalty_rule_versions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [loyalty_rule_versions_effective_at_key] UNIQUE NONCLUSTERED ([effective_at])
);

-- CreateTable
CREATE TABLE [dbo].[loyalty_point_transactions] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [member_id] UNIQUEIDENTIFIER NOT NULL,
    [kind] NVARCHAR(20) NOT NULL,
    [points] INT NOT NULL,
    [qualifying_amount] DECIMAL(15,2) NOT NULL CONSTRAINT [loyalty_point_transactions_qualifying_amount_df] DEFAULT 0,
    [source_key] NVARCHAR(150) NOT NULL,
    [order_id] BIGINT,
    [rule_version_id] BIGINT,
    [description] NVARCHAR(500) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [loyalty_point_transactions_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [loyalty_point_transactions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [loyalty_point_transactions_source_key_key] UNIQUE NONCLUSTERED ([source_key])
);

-- CreateTable
CREATE TABLE [dbo].[loyalty_point_lots] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [transaction_id] BIGINT NOT NULL,
    [member_id] UNIQUEIDENTIFIER NOT NULL,
    [remaining] INT NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    CONSTRAINT [loyalty_point_lots_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [loyalty_point_lots_transaction_id_key] UNIQUE NONCLUSTERED ([transaction_id])
);

-- CreateTable
CREATE TABLE [dbo].[loyalty_rewards] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(150) NOT NULL,
    [description] NVARCHAR(max),
    [points_cost] INT NOT NULL,
    [discount_value] DECIMAL(15,2) NOT NULL,
    [min_order_value] DECIMAL(15,2) NOT NULL CONSTRAINT [loyalty_rewards_min_order_value_df] DEFAULT 0,
    [minimum_tier_spend] DECIMAL(15,2) NOT NULL CONSTRAINT [loyalty_rewards_minimum_tier_spend_df] DEFAULT 0,
    [stock] INT NOT NULL,
    [voucher_days] INT NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [loyalty_rewards_active_df] DEFAULT 1,
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [loyalty_rewards_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [loyalty_rewards_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[loyalty_redemptions] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [member_id] UNIQUEIDENTIFIER NOT NULL,
    [reward_id] BIGINT NOT NULL,
    [coupon_id] BIGINT NOT NULL,
    [coupon_code] NVARCHAR(50) NOT NULL,
    [points_spent] INT NOT NULL,
    [request_key] UNIQUEIDENTIFIER NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [loyalty_redemptions_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [loyalty_redemptions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [loyalty_redemptions_coupon_id_key] UNIQUE NONCLUSTERED ([coupon_id]),
    CONSTRAINT [loyalty_redemptions_coupon_code_key] UNIQUE NONCLUSTERED ([coupon_code]),
    CONSTRAINT [loyalty_redemptions_member_id_request_key_key] UNIQUE NONCLUSTERED ([member_id],[request_key])
);

-- CreateTable
CREATE TABLE [dbo].[loyalty_complaints] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [member_id] UNIQUEIDENTIFIER NOT NULL,
    [order_id] BIGINT,
    [type] NVARCHAR(30) NOT NULL,
    [message] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [loyalty_complaints_status_df] DEFAULT 'OPEN',
    [response] NVARCHAR(max),
    [handled_by] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [loyalty_complaints_created_at_df] DEFAULT sysutcdatetime(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [loyalty_complaints_updated_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [loyalty_complaints_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[loyalty_adjustments] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [member_id] UNIQUEIDENTIFIER NOT NULL,
    [complaint_id] BIGINT,
    [points] INT NOT NULL,
    [reason] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [loyalty_adjustments_status_df] DEFAULT 'PENDING',
    [requested_by] UNIQUEIDENTIFIER NOT NULL,
    [decided_by] UNIQUEIDENTIFIER,
    [decision_note] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [loyalty_adjustments_created_at_df] DEFAULT sysutcdatetime(),
    [decided_at] DATETIME2,
    CONSTRAINT [loyalty_adjustments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[wishlist_items] (
    [wishlist_id] BIGINT NOT NULL,
    [product_id] BIGINT NOT NULL,
    CONSTRAINT [wishlist_items_pkey] PRIMARY KEY CLUSTERED ([wishlist_id],[product_id])
);

-- CreateTable
CREATE TABLE [dbo].[wishlists] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [wishlists_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [wishlists_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uq_wishlists_user] UNIQUE NONCLUSTERED ([user_id])
);

-- CreateTable
CREATE TABLE [dbo].[payment_attempts] (
    [id] NVARCHAR(32) NOT NULL,
    [provider] NVARCHAR(20) NOT NULL CONSTRAINT [payment_attempts_provider_df] DEFAULT 'VNPAY',
    [payment_url] NVARCHAR(max),
    [order_id] BIGINT NOT NULL,
    [amount] DECIMAL(15,2) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [payment_attempts_status_df] DEFAULT 'PENDING',
    [provider_transaction] NVARCHAR(100),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [payment_attempts_created_at_df] DEFAULT sysutcdatetime(),
    [expires_at] DATETIME2 NOT NULL,
    [paid_at] DATETIME2,
    CONSTRAINT [payment_attempts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [payment_attempts_provider_transaction_key] UNIQUE NONCLUSTERED ([provider_transaction])
);

-- CreateTable
CREATE TABLE [dbo].[checkout_requests] (
    [buyer_id] UNIQUEIDENTIFIER NOT NULL,
    [idempotency_key] NVARCHAR(64) NOT NULL,
    [request_hash] NVARCHAR(64) NOT NULL,
    [response] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [checkout_requests_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [checkout_requests_pkey] PRIMARY KEY CLUSTERED ([buyer_id],[idempotency_key])
);

-- CreateTable
CREATE TABLE [dbo].[coupon_redemptions] (
    [order_id] BIGINT NOT NULL,
    [coupon_id] BIGINT NOT NULL,
    [buyer_id] UNIQUEIDENTIFIER NOT NULL,
    [coupon_code] NVARCHAR(50) NOT NULL,
    [discount_amount] DECIMAL(15,2) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [coupon_redemptions_created_at_df] DEFAULT sysutcdatetime(),
    CONSTRAINT [coupon_redemptions_pkey] PRIMARY KEY CLUSTERED ([order_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_addresses_user_id] ON [dbo].[addresses]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_audit_logs_entity] ON [dbo].[audit_logs]([entity_type], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_audit_logs_user_id] ON [dbo].[audit_logs]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_buyer_features_buyer_date] ON [dbo].[buyer_features]([buyer_id], [feature_date] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_cart_items_cart_id] ON [dbo].[cart_items]([cart_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_cart_items_product_id] ON [dbo].[cart_items]([product_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_categories_parent_id] ON [dbo].[categories]([parent_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_coupon_categories_category] ON [dbo].[coupon_categories]([category_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_coupons_status_time] ON [dbo].[coupons]([status], [start_at], [end_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_ml_training_runs_model_id] ON [dbo].[ml_training_runs]([model_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_notifications_reference] ON [dbo].[notifications]([reference_type], [reference_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_notifications_user_unread] ON [dbo].[notifications]([user_id], [created_at] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_order_items_order_id] ON [dbo].[order_items]([order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_order_items_product_id] ON [dbo].[order_items]([product_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_order_status_history_order_id] ON [dbo].[order_status_history]([order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_orders_buyer_created] ON [dbo].[orders]([buyer_id], [created_at] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_orders_buyer_id] ON [dbo].[orders]([buyer_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_orders_shop_id] ON [dbo].[orders]([shop_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_orders_status] ON [dbo].[orders]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_payments_order_id] ON [dbo].[payments]([order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_product_images_product_id] ON [dbo].[product_images]([product_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_product_variants_product_id] ON [dbo].[product_variants]([product_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_products_category_id] ON [dbo].[products]([category_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_products_shop_id] ON [dbo].[products]([shop_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_recommendation_actions_rec_id] ON [dbo].[recommendation_actions]([recommendation_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_recommendations_prediction_id] ON [dbo].[recommendations]([prediction_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_returns_order_id] ON [dbo].[returns]([order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_reviews_buyer_id] ON [dbo].[reviews]([buyer_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_reviews_product_id] ON [dbo].[reviews]([product_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_risk_explanations_prediction_id] ON [dbo].[risk_explanations]([prediction_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_risk_predictions_buyer_time] ON [dbo].[risk_predictions]([buyer_id], [predicted_at] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_risk_predictions_order_id] ON [dbo].[risk_predictions]([order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_shipments_order_id] ON [dbo].[shipments]([order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_shop_members_user_id] ON [dbo].[shop_members]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_shops_owner_id] ON [dbo].[shops]([owner_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [loyalty_rule_versions_status_effective_at_idx] ON [dbo].[loyalty_rule_versions]([status], [effective_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [loyalty_point_transactions_member_id_created_at_id_idx] ON [dbo].[loyalty_point_transactions]([member_id], [created_at] DESC, [id] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [loyalty_point_transactions_order_id_idx] ON [dbo].[loyalty_point_transactions]([order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [loyalty_point_lots_member_id_expires_at_idx] ON [dbo].[loyalty_point_lots]([member_id], [expires_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [loyalty_redemptions_member_id_created_at_idx] ON [dbo].[loyalty_redemptions]([member_id], [created_at] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [loyalty_complaints_member_id_created_at_idx] ON [dbo].[loyalty_complaints]([member_id], [created_at] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [loyalty_adjustments_status_created_at_idx] ON [dbo].[loyalty_adjustments]([status], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_wishlists_user_id] ON [dbo].[wishlists]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [payment_attempts_order_id_status_idx] ON [dbo].[payment_attempts]([order_id], [status]);

-- AddForeignKey
ALTER TABLE [dbo].[addresses] ADD CONSTRAINT [addresses_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[buyer_features] ADD CONSTRAINT [buyer_features_buyer_id_fkey] FOREIGN KEY ([buyer_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[buyer_profiles] ADD CONSTRAINT [buyer_profiles_buyer_id_fkey] FOREIGN KEY ([buyer_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cart_items] ADD CONSTRAINT [cart_items_cart_id_fkey] FOREIGN KEY ([cart_id]) REFERENCES [dbo].[carts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cart_items] ADD CONSTRAINT [cart_items_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cart_items] ADD CONSTRAINT [cart_items_variant_id_fkey] FOREIGN KEY ([variant_id]) REFERENCES [dbo].[product_variants]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[carts] ADD CONSTRAINT [carts_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[categories] ADD CONSTRAINT [categories_parent_id_fkey] FOREIGN KEY ([parent_id]) REFERENCES [dbo].[categories]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[coupon_categories] ADD CONSTRAINT [coupon_categories_category_id_fkey] FOREIGN KEY ([category_id]) REFERENCES [dbo].[categories]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[coupon_categories] ADD CONSTRAINT [coupon_categories_coupon_id_fkey] FOREIGN KEY ([coupon_id]) REFERENCES [dbo].[coupons]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ml_training_runs] ADD CONSTRAINT [ml_training_runs_model_id_fkey] FOREIGN KEY ([model_id]) REFERENCES [dbo].[ml_models]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[order_items] ADD CONSTRAINT [order_items_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[order_items] ADD CONSTRAINT [order_items_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[order_items] ADD CONSTRAINT [order_items_variant_id_fkey] FOREIGN KEY ([variant_id]) REFERENCES [dbo].[product_variants]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[order_status_history] ADD CONSTRAINT [order_status_history_changed_by_fkey] FOREIGN KEY ([changed_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[order_status_history] ADD CONSTRAINT [order_status_history_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[orders] ADD CONSTRAINT [orders_buyer_id_fkey] FOREIGN KEY ([buyer_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[orders] ADD CONSTRAINT [orders_shipping_address_id_fkey] FOREIGN KEY ([shipping_address_id]) REFERENCES [dbo].[addresses]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[orders] ADD CONSTRAINT [orders_shop_id_fkey] FOREIGN KEY ([shop_id]) REFERENCES [dbo].[shops]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[payments] ADD CONSTRAINT [payments_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_images] ADD CONSTRAINT [product_images_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_variants] ADD CONSTRAINT [product_variants_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[products] ADD CONSTRAINT [products_category_id_fkey] FOREIGN KEY ([category_id]) REFERENCES [dbo].[categories]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[products] ADD CONSTRAINT [products_shop_id_fkey] FOREIGN KEY ([shop_id]) REFERENCES [dbo].[shops]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recommendation_actions] ADD CONSTRAINT [recommendation_actions_recommendation_id_fkey] FOREIGN KEY ([recommendation_id]) REFERENCES [dbo].[recommendations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recommendation_actions] ADD CONSTRAINT [recommendation_actions_seller_id_fkey] FOREIGN KEY ([seller_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recommendations] ADD CONSTRAINT [recommendations_prediction_id_fkey] FOREIGN KEY ([prediction_id]) REFERENCES [dbo].[risk_predictions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[returns] ADD CONSTRAINT [returns_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[reviews] ADD CONSTRAINT [reviews_buyer_id_fkey] FOREIGN KEY ([buyer_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[reviews] ADD CONSTRAINT [reviews_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[reviews] ADD CONSTRAINT [reviews_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[risk_explanations] ADD CONSTRAINT [risk_explanations_prediction_id_fkey] FOREIGN KEY ([prediction_id]) REFERENCES [dbo].[risk_predictions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[risk_predictions] ADD CONSTRAINT [risk_predictions_buyer_id_fkey] FOREIGN KEY ([buyer_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[risk_predictions] ADD CONSTRAINT [risk_predictions_model_id_fkey] FOREIGN KEY ([model_id]) REFERENCES [dbo].[ml_models]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[risk_predictions] ADD CONSTRAINT [risk_predictions_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[shipments] ADD CONSTRAINT [shipments_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[shop_members] ADD CONSTRAINT [shop_members_shop_id_fkey] FOREIGN KEY ([shop_id]) REFERENCES [dbo].[shops]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[shop_members] ADD CONSTRAINT [shop_members_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[shops] ADD CONSTRAINT [shops_owner_id_fkey] FOREIGN KEY ([owner_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_roles] ADD CONSTRAINT [user_roles_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_roles] ADD CONSTRAINT [user_roles_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[loyalty_members] ADD CONSTRAINT [loyalty_members_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[loyalty_point_transactions] ADD CONSTRAINT [loyalty_point_transactions_member_id_fkey] FOREIGN KEY ([member_id]) REFERENCES [dbo].[loyalty_members]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[loyalty_point_transactions] ADD CONSTRAINT [loyalty_point_transactions_rule_version_id_fkey] FOREIGN KEY ([rule_version_id]) REFERENCES [dbo].[loyalty_rule_versions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[loyalty_point_lots] ADD CONSTRAINT [loyalty_point_lots_transaction_id_fkey] FOREIGN KEY ([transaction_id]) REFERENCES [dbo].[loyalty_point_transactions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[loyalty_redemptions] ADD CONSTRAINT [loyalty_redemptions_member_id_fkey] FOREIGN KEY ([member_id]) REFERENCES [dbo].[loyalty_members]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[loyalty_redemptions] ADD CONSTRAINT [loyalty_redemptions_reward_id_fkey] FOREIGN KEY ([reward_id]) REFERENCES [dbo].[loyalty_rewards]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[loyalty_complaints] ADD CONSTRAINT [loyalty_complaints_member_id_fkey] FOREIGN KEY ([member_id]) REFERENCES [dbo].[loyalty_members]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[loyalty_adjustments] ADD CONSTRAINT [loyalty_adjustments_member_id_fkey] FOREIGN KEY ([member_id]) REFERENCES [dbo].[loyalty_members]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[loyalty_adjustments] ADD CONSTRAINT [loyalty_adjustments_complaint_id_fkey] FOREIGN KEY ([complaint_id]) REFERENCES [dbo].[loyalty_complaints]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[wishlist_items] ADD CONSTRAINT [wishlist_items_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[wishlist_items] ADD CONSTRAINT [wishlist_items_wishlist_id_fkey] FOREIGN KEY ([wishlist_id]) REFERENCES [dbo].[wishlists]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[wishlists] ADD CONSTRAINT [wishlists_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[payment_attempts] ADD CONSTRAINT [payment_attempts_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
