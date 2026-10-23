BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Gateway] (
    [gatewayId] INT NOT NULL,
    [name] VARCHAR(50) NOT NULL,
    [idFormat] VARCHAR(10) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Gateway_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Gateway_pkey] PRIMARY KEY CLUSTERED ([gatewayId] ASC),
    CONSTRAINT [Gateway_name_key] UNIQUE NONCLUSTERED ([name] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[Merchant] (
    [merchantId] INT NOT NULL,
    [name] VARCHAR(100) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Merchant_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Merchant_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Merchant_pkey] PRIMARY KEY CLUSTERED ([merchantId] ASC),
    CONSTRAINT [Merchant_name_key] UNIQUE NONCLUSTERED ([name] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[Provider] (
    [providerId] INT NOT NULL,
    [merchantId] INT NOT NULL,
    [name] VARCHAR(100) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Provider_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Provider_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Provider_pkey] PRIMARY KEY CLUSTERED ([providerId] ASC),
    CONSTRAINT [Provider_merchantId_name_key] UNIQUE NONCLUSTERED ([merchantId] ASC, [name] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[Channel] (
    [channelId] INT NOT NULL,
    [gatewayId] INT NOT NULL,
    [providerId] INT NOT NULL,
    [name] VARCHAR(50) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Channel_isActive_df] DEFAULT 1,
    [settlementTermDays] INT NOT NULL,
    [rollingReservePct] DECIMAL(9,6) NOT NULL,
    [rollingReserveDays] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Channel_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Channel_pkey] PRIMARY KEY CLUSTERED ([channelId] ASC),
    CONSTRAINT [Channel_gatewayId_name_key] UNIQUE NONCLUSTERED ([gatewayId] ASC, [name] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[Account] (
    [accountId] UNIQUEIDENTIFIER NOT NULL,
    [providerId] INT NOT NULL,
    [name] VARCHAR(50) NOT NULL,
    [chargebackReservePolicy] VARCHAR(30) NOT NULL,
    [rollingReserveCapAmt] DECIMAL(19,4),
    [matchingRuleSetId] INT,
    [isActive] BIT NOT NULL CONSTRAINT [Account_isActive_df] DEFAULT 1,
    [createdByUserId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Account_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Account_pkey] PRIMARY KEY CLUSTERED ([accountId] ASC),
    CONSTRAINT [Account_name_key] UNIQUE NONCLUSTERED ([name] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[AccountChannel] (
    [accountId] UNIQUEIDENTIFIER NOT NULL,
    [channelId] INT NOT NULL,
    [isPrimary] BIT NOT NULL,
    [assignedAt] DATETIME2 NOT NULL,
    [assignedInBatchId] UNIQUEIDENTIFIER,
    [assignedByUserId] INT,
    CONSTRAINT [AccountChannel_pkey] PRIMARY KEY CLUSTERED ([accountId] ASC,[channelId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[FeeType] (
    [feeTypeId] INT NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [title] VARCHAR(80) NOT NULL,
    [isTransactional] BIT NOT NULL,
    [appliesToStatusId] INT,
    [allowsFreeAmount] BIT NOT NULL CONSTRAINT [FeeType_allowsFreeAmount_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [FeeType_isActive_df] DEFAULT 1,
    CONSTRAINT [FeeType_pkey] PRIMARY KEY CLUSTERED ([feeTypeId] ASC),
    CONSTRAINT [FeeType_code_key] UNIQUE NONCLUSTERED ([code] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[Fee] (
    [feeId] UNIQUEIDENTIFIER NOT NULL,
    [accountId] UNIQUEIDENTIFIER NOT NULL,
    [feeTypeId] INT NOT NULL,
    [fixedAmount] DECIMAL(19,4),
    [percentage] DECIMAL(9,6),
    [conditionalPercentage] DECIMAL(9,6),
    [conditionThresholdAmt] DECIMAL(19,4),
    [brandFixedAmount] DECIMAL(19,4),
    [brandPercentage] DECIMAL(9,6),
    [startDate] DATE,
    [endDate] DATE,
    [description] VARCHAR(100),
    [createdByUserId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Fee_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Fee_pkey] PRIMARY KEY CLUSTERED ([feeId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[FeeHistory] (
    [feeHistoryId] INT IDENTITY(1,1) NOT NULL,
    [feeId] UNIQUEIDENTIFIER NOT NULL,
    [changedByUserId] INT NOT NULL,
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [FeeHistory_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [action] VARCHAR(20) NOT NULL,
    [beforeJson] NVARCHAR(max),
    [afterJson] NVARCHAR(max) NOT NULL,
    [reason] NVARCHAR(500),
    CONSTRAINT [FeeHistory_pkey] PRIMARY KEY CLUSTERED ([feeHistoryId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[MatchingRuleSet] (
    [ruleSetId] INT IDENTITY(1,1) NOT NULL,
    [providerId] INT NOT NULL,
    [name] VARCHAR(80) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [MatchingRuleSet_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MatchingRuleSet_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MatchingRuleSet_pkey] PRIMARY KEY CLUSTERED ([ruleSetId] ASC),
    CONSTRAINT [MatchingRuleSet_providerId_name_key] UNIQUE NONCLUSTERED ([providerId] ASC, [name] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[MatchingSheetRule] (
    [sheetRuleId] INT IDENTITY(1,1) NOT NULL,
    [ruleSetId] INT,
    [sheetPattern] NVARCHAR(128) NOT NULL,
    [isRegex] BIT NOT NULL CONSTRAINT [MatchingSheetRule_isRegex_df] DEFAULT 0,
    [kind] VARCHAR(20) NOT NULL,
    [cycle] CHAR(1),
    [statusId] INT,
    [priority] INT NOT NULL CONSTRAINT [MatchingSheetRule_priority_df] DEFAULT 100,
    [isActive] BIT NOT NULL CONSTRAINT [MatchingSheetRule_isActive_df] DEFAULT 1,
    CONSTRAINT [MatchingSheetRule_pkey] PRIMARY KEY CLUSTERED ([sheetRuleId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[MatchingColumnRule] (
    [columnRuleId] INT IDENTITY(1,1) NOT NULL,
    [ruleSetId] INT,
    [sheetPattern] NVARCHAR(128),
    [columnPattern] NVARCHAR(128) NOT NULL,
    [isRegex] BIT NOT NULL CONSTRAINT [MatchingColumnRule_isRegex_df] DEFAULT 0,
    [targetField] VARCHAR(30) NOT NULL,
    [priority] INT NOT NULL CONSTRAINT [MatchingColumnRule_priority_df] DEFAULT 100,
    [isActive] BIT NOT NULL CONSTRAINT [MatchingColumnRule_isActive_df] DEFAULT 1,
    CONSTRAINT [MatchingColumnRule_pkey] PRIMARY KEY CLUSTERED ([columnRuleId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[MatchingRowIgnoreRule] (
    [rowIgnoreId] INT IDENTITY(1,1) NOT NULL,
    [ruleSetId] INT,
    [pattern] NVARCHAR(200) NOT NULL,
    [isRegex] BIT NOT NULL CONSTRAINT [MatchingRowIgnoreRule_isRegex_df] DEFAULT 0,
    [description] NVARCHAR(200),
    [isActive] BIT NOT NULL CONSTRAINT [MatchingRowIgnoreRule_isActive_df] DEFAULT 1,
    CONSTRAINT [MatchingRowIgnoreRule_pkey] PRIMARY KEY CLUSTERED ([rowIgnoreId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[MatchingStatusAlias] (
    [alias] NVARCHAR(50) NOT NULL,
    [statusId] INT NOT NULL,
    [excludeAmount] BIT NOT NULL CONSTRAINT [MatchingStatusAlias_excludeAmount_df] DEFAULT 0,
    [isLegacy] BIT NOT NULL CONSTRAINT [MatchingStatusAlias_isLegacy_df] DEFAULT 0,
    CONSTRAINT [MatchingStatusAlias_pkey] PRIMARY KEY CLUSTERED ([alias] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[Cycle] (
    [cycle] CHAR(1) NOT NULL,
    [name] VARCHAR(30) NOT NULL,
    CONSTRAINT [Cycle_pkey] PRIMARY KEY CLUSTERED ([cycle] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[TransactionStatus] (
    [statusId] INT NOT NULL,
    [code] VARCHAR(20) NOT NULL,
    [name] VARCHAR(50) NOT NULL,
    [cycle] CHAR(1) NOT NULL,
    CONSTRAINT [TransactionStatus_pkey] PRIMARY KEY CLUSTERED ([statusId] ASC),
    CONSTRAINT [TransactionStatus_code_key] UNIQUE NONCLUSTERED ([code] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[SettlementStatus] (
    [settlementStatusId] INT NOT NULL,
    [name] VARCHAR(30) NOT NULL,
    CONSTRAINT [SettlementStatus_pkey] PRIMARY KEY CLUSTERED ([settlementStatusId] ASC),
    CONSTRAINT [SettlementStatus_name_key] UNIQUE NONCLUSTERED ([name] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[Transaction] (
    [transactionId] BIGINT IDENTITY(1,1) NOT NULL,
    [sourceTransactionId] VARCHAR(36) NOT NULL,
    [gatewayId] INT NOT NULL,
    [merchantId] INT NOT NULL,
    [providerId] INT NOT NULL,
    [channelId] INT NOT NULL,
    [orderId] VARCHAR(50),
    [amount] DECIMAL(19,4) NOT NULL,
    [currency] CHAR(3) NOT NULL CONSTRAINT [Transaction_currency_df] DEFAULT 'USD',
    [cardBrand] VARCHAR(20),
    [statusId] INT NOT NULL,
    [transactionDate] DATETIME2 NOT NULL,
    [lastStatusChangedAt] DATETIME2,
    [appliedReservePct] DECIMAL(9,6) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Transaction_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Transaction_pkey] PRIMARY KEY CLUSTERED ([transactionId] ASC),
    CONSTRAINT [Transaction_gatewayId_sourceTransactionId_key] UNIQUE NONCLUSTERED ([gatewayId] ASC, [sourceTransactionId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[Import] (
    [importId] UNIQUEIDENTIFIER NOT NULL,
    [accountId] UNIQUEIDENTIFIER NOT NULL,
    [createdByUserId] INT NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [analyzedAt] DATETIME2,
    [rowsTotal] INT,
    [rowsMatched] INT,
    [rowsUnmatched] INT,
    [currentBatchId] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Import_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Import_pkey] PRIMARY KEY CLUSTERED ([importId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[ImportFile] (
    [fileId] UNIQUEIDENTIFIER NOT NULL,
    [importId] UNIQUEIDENTIFIER NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [storagePath] NVARCHAR(500) NOT NULL,
    [sizeBytes] INT NOT NULL,
    [sha256] CHAR(64) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [ImportFile_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [ignore] BIT NOT NULL CONSTRAINT [ImportFile_ignore_df] DEFAULT 0,
    CONSTRAINT [ImportFile_pkey] PRIMARY KEY CLUSTERED ([fileId] ASC),
    CONSTRAINT [ImportFile_importId_sha256_key] UNIQUE NONCLUSTERED ([importId] ASC, [sha256] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[ImportSheet] (
    [sheetId] UNIQUEIDENTIFIER NOT NULL,
    [fileId] UNIQUEIDENTIFIER NOT NULL,
    [sheetName] NVARCHAR(128) NOT NULL,
    [kind] VARCHAR(20) NOT NULL,
    [cycle] CHAR(1),
    [statusId] INT,
    [rowCount] INT NOT NULL CONSTRAINT [ImportSheet_rowCount_df] DEFAULT 0,
    [mappingConfirmed] BIT NOT NULL CONSTRAINT [ImportSheet_mappingConfirmed_df] DEFAULT 0,
    CONSTRAINT [ImportSheet_pkey] PRIMARY KEY CLUSTERED ([sheetId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[ImportSheetColumnMap] (
    [sheetId] UNIQUEIDENTIFIER NOT NULL,
    [sourceColumn] NVARCHAR(128) NOT NULL,
    [targetField] VARCHAR(30) NOT NULL,
    CONSTRAINT [ImportSheetColumnMap_pkey] PRIMARY KEY CLUSTERED ([sheetId] ASC,[sourceColumn] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[ImportRow] (
    [sheetId] UNIQUEIDENTIFIER NOT NULL,
    [rowNo] INT NOT NULL,
    [transactionIdRaw] NVARCHAR(100),
    [transactionId] BIGINT,
    [gatewayId] INT,
    [statusRaw] NVARCHAR(50),
    [statusId] INT,
    [cycle] CHAR(1) NOT NULL,
    [amount] DECIMAL(19,4),
    [currency] CHAR(3),
    [txnDate] DATETIME2,
    [feeTypeRaw] NVARCHAR(100),
    [rawData] NVARCHAR(max) NOT NULL,
    [ignore] BIT NOT NULL CONSTRAINT [ImportRow_ignore_df] DEFAULT 0,
    [matchResult] VARCHAR(20) NOT NULL,
    [detailJson] NVARCHAR(max),
    CONSTRAINT [ImportRow_pkey] PRIMARY KEY CLUSTERED ([sheetId] ASC,[rowNo] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[ValidationRun] (
    [runId] INT IDENTITY(1,1) NOT NULL,
    [importId] UNIQUEIDENTIFIER NOT NULL,
    [runAt] DATETIME2 NOT NULL CONSTRAINT [ValidationRun_runAt_df] DEFAULT CURRENT_TIMESTAMP,
    [runByUserId] INT NOT NULL,
    [dateMinApp] DATETIME2,
    [dateMaxApp] DATETIME2,
    [dateMinDec] DATETIME2,
    [dateMaxDec] DATETIME2,
    [dateMinI] DATETIME2,
    [dateMaxI] DATETIME2,
    [dateMinR] DATETIME2,
    [dateMaxR] DATETIME2,
    [pendingInRangeCount] INT NOT NULL CONSTRAINT [ValidationRun_pendingInRangeCount_df] DEFAULT 0,
    [isSuperseded] BIT NOT NULL CONSTRAINT [ValidationRun_isSuperseded_df] DEFAULT 0,
    CONSTRAINT [ValidationRun_pkey] PRIMARY KEY CLUSTERED ([runId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[ValidationResult] (
    [resultId] INT IDENTITY(1,1) NOT NULL,
    [runId] INT NOT NULL,
    [validationCode] VARCHAR(40) NOT NULL,
    [outcome] VARCHAR(20) NOT NULL,
    [issueCount] INT NOT NULL CONSTRAINT [ValidationResult_issueCount_df] DEFAULT 0,
    [detailJson] NVARCHAR(max),
    CONSTRAINT [ValidationResult_pkey] PRIMARY KEY CLUSTERED ([resultId] ASC),
    CONSTRAINT [ValidationResult_runId_validationCode_key] UNIQUE NONCLUSTERED ([runId] ASC, [validationCode] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[ValidationIssue] (
    [issueId] INT IDENTITY(1,1) NOT NULL,
    [resultId] INT NOT NULL,
    [issueType] VARCHAR(30) NOT NULL,
    [scope] VARCHAR(30),
    [blocking] BIT NOT NULL CONSTRAINT [ValidationIssue_blocking_df] DEFAULT 0,
    [transactionIdRaw] NVARCHAR(100),
    [transactionId] BIGINT,
    [cycle] CHAR(1),
    [statusId] INT,
    [missingType] VARCHAR(30),
    [relevantDate] DATETIME2,
    [detectedInBatchId] UNIQUEIDENTIFIER,
    [detailJson] NVARCHAR(max),
    [resolutionStatus] VARCHAR(20) NOT NULL CONSTRAINT [ValidationIssue_resolutionStatus_df] DEFAULT 'persistent',
    [resolvedInBatchId] UNIQUEIDENTIFIER,
    [resolvedAt] DATETIME2,
    [resolvedByUserId] INT,
    [resolutionNote] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ValidationIssue_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ValidationIssue_pkey] PRIMARY KEY CLUSTERED ([issueId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[ConflictOccurrence] (
    [occurrenceId] BIGINT IDENTITY(1,1) NOT NULL,
    [issueId] INT NOT NULL,
    [sourceType] VARCHAR(20) NOT NULL,
    [batchId] UNIQUEIDENTIFIER,
    [fileId] UNIQUEIDENTIFIER,
    [sheetId] UNIQUEIDENTIFIER,
    [rowNo] INT,
    [statusId] INT NOT NULL,
    [includeInSettlement] BIT NOT NULL,
    [defaultIncluded] BIT NOT NULL,
    [changedByUserId] INT,
    [changedAt] DATETIME2,
    CONSTRAINT [ConflictOccurrence_pkey] PRIMARY KEY CLUSTERED ([occurrenceId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[SettlementBatch] (
    [batchId] UNIQUEIDENTIFIER NOT NULL,
    [accountId] UNIQUEIDENTIFIER NOT NULL,
    [batchNo] INT NOT NULL,
    [attemptNo] INT NOT NULL CONSTRAINT [SettlementBatch_attemptNo_df] DEFAULT 1,
    [importId] UNIQUEIDENTIFIER NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [approvedByUserId] INT NOT NULL,
    [processedAt] DATETIME2 NOT NULL CONSTRAINT [SettlementBatch_processedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [settlementDate] DATE,
    [paidAt] DATETIME2,
    [paidByUserId] INT,
    [undoneAt] DATETIME2,
    [undoneByUserId] INT,
    [undoReason] NVARCHAR(500),
    [dateMinApp] DATETIME2,
    [dateMaxApp] DATETIME2,
    [dateMinDec] DATETIME2,
    [dateMaxDec] DATETIME2,
    [dateMinI] DATETIME2,
    [dateMaxI] DATETIME2,
    [dateMinR] DATETIME2,
    [dateMaxR] DATETIME2,
    [mdrAmt] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementBatch_mdrAmt_df] DEFAULT 0,
    [mdrRate] DECIMAL(9,6),
    [otherFeeAmt] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementBatch_otherFeeAmt_df] DEFAULT 0,
    [reserveHeldAmt] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementBatch_reserveHeldAmt_df] DEFAULT 0,
    [reserveReleasedAmt] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementBatch_reserveReleasedAmt_df] DEFAULT 0,
    [amountPayable] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementBatch_amountPayable_df] DEFAULT 0,
    [channels] VARCHAR(100),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SettlementBatch_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SettlementBatch_pkey] PRIMARY KEY CLUSTERED ([batchId] ASC),
    CONSTRAINT [SettlementBatch_accountId_batchNo_attemptNo_key] UNIQUE NONCLUSTERED ([accountId] ASC, [batchNo] ASC, [attemptNo] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[SettlementBatchFee] (
    [batchFeeId] INT IDENTITY(1,1) NOT NULL,
    [batchId] UNIQUEIDENTIFIER NOT NULL,
    [feeTypeId] INT NOT NULL,
    [feeId] UNIQUEIDENTIFIER,
    [amount] DECIMAL(19,4) NOT NULL,
    [description] NVARCHAR(200),
    [source] VARCHAR(10) NOT NULL CONSTRAINT [SettlementBatchFee_source_df] DEFAULT 'manual',
    [enteredByUserId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SettlementBatchFee_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SettlementBatchFee_pkey] PRIMARY KEY CLUSTERED ([batchFeeId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[SettlementBatchTotal] (
    [batchId] UNIQUEIDENTIFIER NOT NULL,
    [category] VARCHAR(20) NOT NULL,
    [qty] INT NOT NULL CONSTRAINT [SettlementBatchTotal_qty_df] DEFAULT 0,
    [amount] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementBatchTotal_amount_df] DEFAULT 0,
    [feeAmount] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementBatchTotal_feeAmount_df] DEFAULT 0,
    [feeRate] DECIMAL(9,6),
    CONSTRAINT [SettlementBatchTotal_pkey] PRIMARY KEY CLUSTERED ([batchId] ASC,[category] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[SettlementBatchBrandTotal] (
    [batchId] UNIQUEIDENTIFIER NOT NULL,
    [cardBrand] VARCHAR(20) NOT NULL,
    [qty] INT NOT NULL CONSTRAINT [SettlementBatchBrandTotal_qty_df] DEFAULT 0,
    [amount] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementBatchBrandTotal_amount_df] DEFAULT 0,
    CONSTRAINT [SettlementBatchBrandTotal_pkey] PRIMARY KEY CLUSTERED ([batchId] ASC,[cardBrand] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[SettlementTransaction] (
    [settlementTxnId] BIGINT IDENTITY(1,1) NOT NULL,
    [batchId] UNIQUEIDENTIFIER NOT NULL,
    [transactionId] BIGINT NOT NULL,
    [cycle] CHAR(1) NOT NULL,
    [statusId] INT NOT NULL,
    [settlementStatusId] INT NOT NULL,
    [roundNo] INT,
    [sheetId] UNIQUEIDENTIFIER,
    [rowNo] INT,
    [amount] DECIMAL(19,4) NOT NULL,
    [excludeAmount] BIT NOT NULL CONSTRAINT [SettlementTransaction_excludeAmount_df] DEFAULT 0,
    [feeAmount] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementTransaction_feeAmount_df] DEFAULT 0,
    [eventDate] DATETIME2 NOT NULL,
    [appliedReservePct] DECIMAL(9,6) NOT NULL,
    [reserveDaysUsed] INT NOT NULL,
    [expectedReserveReleaseAt] DATETIME2,
    [reservePolicySnapshot] NVARCHAR(max),
    [reserveEarlyReleasedAmt] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementTransaction_reserveEarlyReleasedAmt_df] DEFAULT 0,
    [reserveHeldAmt] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementTransaction_reserveHeldAmt_df] DEFAULT 0,
    [reserveReleasedAmt] DECIMAL(19,4) NOT NULL CONSTRAINT [SettlementTransaction_reserveReleasedAmt_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SettlementTransaction_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SettlementTransaction_pkey] PRIMARY KEY CLUSTERED ([settlementTxnId] ASC),
    CONSTRAINT [SettlementTransaction_transactionId_cycle_batchId_key] UNIQUE NONCLUSTERED ([transactionId] ASC, [cycle] ASC, [batchId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[SettlementTransactionFee] (
    [appliedFeeId] BIGINT IDENTITY(1,1) NOT NULL,
    [settlementTxnId] BIGINT NOT NULL,
    [feeId] UNIQUEIDENTIFIER NOT NULL,
    [feeTypeId] INT NOT NULL,
    [eventDate] DATETIME2 NOT NULL,
    [amountUsd] DECIMAL(19,4) NOT NULL,
    [configurationSnapshot] NVARCHAR(max) NOT NULL,
    CONSTRAINT [SettlementTransactionFee_pkey] PRIMARY KEY CLUSTERED ([appliedFeeId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [roleId] INT IDENTITY(1,1) NOT NULL,
    [name] VARCHAR(30) NOT NULL,
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([roleId] ASC),
    CONSTRAINT [Role_name_key] UNIQUE NONCLUSTERED ([name] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[RolePermission] (
    [roleId] INT NOT NULL,
    [permissionCode] VARCHAR(40) NOT NULL,
    CONSTRAINT [RolePermission_pkey] PRIMARY KEY CLUSTERED ([roleId] ASC,[permissionCode] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [userId] INT IDENTITY(1,1) NOT NULL,
    [userName] VARCHAR(50) NOT NULL,
    [email] VARCHAR(120) NOT NULL,
    [displayName] NVARCHAR(100) NOT NULL,
    [passwordHash] VARCHAR(255) NOT NULL,
    [roleId] INT NOT NULL,
    [merchantScope] VARCHAR(10) NOT NULL CONSTRAINT [User_merchantScope_df] DEFAULT 'assigned',
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([userId] ASC),
    CONSTRAINT [User_userName_key] UNIQUE NONCLUSTERED ([userName] ASC),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[UserMerchant] (
    [userId] INT NOT NULL,
    [merchantId] INT NOT NULL,
    CONSTRAINT [UserMerchant_pkey] PRIMARY KEY CLUSTERED ([userId] ASC,[merchantId] ASC)
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [auditId] BIGINT IDENTITY(1,1) NOT NULL,
    [userId] INT NOT NULL,
    [action] VARCHAR(60) NOT NULL,
    [entityType] VARCHAR(40) NOT NULL,
    [entityId] VARCHAR(64) NOT NULL,
    [detailJson] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([auditId] ASC)
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Channel_providerId_idx] ON [dbo].[Channel]([providerId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Account_providerId_idx] ON [dbo].[Account]([providerId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccountChannel_channelId_idx] ON [dbo].[AccountChannel]([channelId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Fee_accountId_feeTypeId_startDate_endDate_idx] ON [dbo].[Fee]([accountId] ASC, [feeTypeId] ASC, [startDate] ASC, [endDate] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FeeHistory_feeId_changedAt_idx] ON [dbo].[FeeHistory]([feeId] ASC, [changedAt] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MatchingSheetRule_ruleSetId_priority_idx] ON [dbo].[MatchingSheetRule]([ruleSetId] ASC, [priority] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MatchingColumnRule_ruleSetId_priority_idx] ON [dbo].[MatchingColumnRule]([ruleSetId] ASC, [priority] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Transaction_providerId_transactionDate_idx] ON [dbo].[Transaction]([providerId] ASC, [transactionDate] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Transaction_merchantId_transactionDate_idx] ON [dbo].[Transaction]([merchantId] ASC, [transactionDate] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Transaction_channelId_transactionDate_idx] ON [dbo].[Transaction]([channelId] ASC, [transactionDate] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Transaction_statusId_idx] ON [dbo].[Transaction]([statusId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Import_accountId_createdAt_idx] ON [dbo].[Import]([accountId] ASC, [createdAt] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImportSheet_fileId_idx] ON [dbo].[ImportSheet]([fileId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImportRow_transactionId_idx] ON [dbo].[ImportRow]([transactionId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImportRow_sheetId_statusId_idx] ON [dbo].[ImportRow]([sheetId] ASC, [statusId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImportRow_transactionIdRaw_idx] ON [dbo].[ImportRow]([transactionIdRaw] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ValidationRun_importId_runAt_idx] ON [dbo].[ValidationRun]([importId] ASC, [runAt] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ValidationIssue_resultId_issueType_idx] ON [dbo].[ValidationIssue]([resultId] ASC, [issueType] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ValidationIssue_transactionId_cycle_resolutionStatus_idx] ON [dbo].[ValidationIssue]([transactionId] ASC, [cycle] ASC, [resolutionStatus] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ConflictOccurrence_issueId_idx] ON [dbo].[ConflictOccurrence]([issueId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SettlementBatch_importId_idx] ON [dbo].[SettlementBatch]([importId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SettlementBatch_accountId_status_settlementDate_idx] ON [dbo].[SettlementBatch]([accountId] ASC, [status] ASC, [settlementDate] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SettlementBatchFee_batchId_idx] ON [dbo].[SettlementBatchFee]([batchId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SettlementTransaction_batchId_cycle_idx] ON [dbo].[SettlementTransaction]([batchId] ASC, [cycle] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SettlementTransaction_transactionId_cycle_idx] ON [dbo].[SettlementTransaction]([transactionId] ASC, [cycle] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SettlementTransactionFee_settlementTxnId_idx] ON [dbo].[SettlementTransactionFee]([settlementTxnId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entityType_entityId_idx] ON [dbo].[AuditLog]([entityType] ASC, [entityId] ASC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_userId_createdAt_idx] ON [dbo].[AuditLog]([userId] ASC, [createdAt] ASC);

-- AddForeignKey
ALTER TABLE [dbo].[Provider] ADD CONSTRAINT [Provider_merchantId_fkey] FOREIGN KEY ([merchantId]) REFERENCES [dbo].[Merchant]([merchantId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Channel] ADD CONSTRAINT [Channel_gatewayId_fkey] FOREIGN KEY ([gatewayId]) REFERENCES [dbo].[Gateway]([gatewayId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Channel] ADD CONSTRAINT [Channel_providerId_fkey] FOREIGN KEY ([providerId]) REFERENCES [dbo].[Provider]([providerId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_providerId_fkey] FOREIGN KEY ([providerId]) REFERENCES [dbo].[Provider]([providerId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_matchingRuleSetId_fkey] FOREIGN KEY ([matchingRuleSetId]) REFERENCES [dbo].[MatchingRuleSet]([ruleSetId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_createdByUserId_fkey] FOREIGN KEY ([createdByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccountChannel] ADD CONSTRAINT [AccountChannel_accountId_fkey] FOREIGN KEY ([accountId]) REFERENCES [dbo].[Account]([accountId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccountChannel] ADD CONSTRAINT [AccountChannel_channelId_fkey] FOREIGN KEY ([channelId]) REFERENCES [dbo].[Channel]([channelId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccountChannel] ADD CONSTRAINT [AccountChannel_assignedInBatchId_fkey] FOREIGN KEY ([assignedInBatchId]) REFERENCES [dbo].[SettlementBatch]([batchId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccountChannel] ADD CONSTRAINT [AccountChannel_assignedByUserId_fkey] FOREIGN KEY ([assignedByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FeeType] ADD CONSTRAINT [FeeType_appliesToStatusId_fkey] FOREIGN KEY ([appliesToStatusId]) REFERENCES [dbo].[TransactionStatus]([statusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Fee] ADD CONSTRAINT [Fee_accountId_fkey] FOREIGN KEY ([accountId]) REFERENCES [dbo].[Account]([accountId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Fee] ADD CONSTRAINT [Fee_feeTypeId_fkey] FOREIGN KEY ([feeTypeId]) REFERENCES [dbo].[FeeType]([feeTypeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Fee] ADD CONSTRAINT [Fee_createdByUserId_fkey] FOREIGN KEY ([createdByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FeeHistory] ADD CONSTRAINT [FeeHistory_feeId_fkey] FOREIGN KEY ([feeId]) REFERENCES [dbo].[Fee]([feeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FeeHistory] ADD CONSTRAINT [FeeHistory_changedByUserId_fkey] FOREIGN KEY ([changedByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MatchingRuleSet] ADD CONSTRAINT [MatchingRuleSet_providerId_fkey] FOREIGN KEY ([providerId]) REFERENCES [dbo].[Provider]([providerId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MatchingSheetRule] ADD CONSTRAINT [MatchingSheetRule_ruleSetId_fkey] FOREIGN KEY ([ruleSetId]) REFERENCES [dbo].[MatchingRuleSet]([ruleSetId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MatchingSheetRule] ADD CONSTRAINT [MatchingSheetRule_cycle_fkey] FOREIGN KEY ([cycle]) REFERENCES [dbo].[Cycle]([cycle]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MatchingSheetRule] ADD CONSTRAINT [MatchingSheetRule_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[TransactionStatus]([statusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MatchingColumnRule] ADD CONSTRAINT [MatchingColumnRule_ruleSetId_fkey] FOREIGN KEY ([ruleSetId]) REFERENCES [dbo].[MatchingRuleSet]([ruleSetId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MatchingRowIgnoreRule] ADD CONSTRAINT [MatchingRowIgnoreRule_ruleSetId_fkey] FOREIGN KEY ([ruleSetId]) REFERENCES [dbo].[MatchingRuleSet]([ruleSetId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MatchingStatusAlias] ADD CONSTRAINT [MatchingStatusAlias_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[TransactionStatus]([statusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [Transaction_gatewayId_fkey] FOREIGN KEY ([gatewayId]) REFERENCES [dbo].[Gateway]([gatewayId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [Transaction_merchantId_fkey] FOREIGN KEY ([merchantId]) REFERENCES [dbo].[Merchant]([merchantId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [Transaction_providerId_fkey] FOREIGN KEY ([providerId]) REFERENCES [dbo].[Provider]([providerId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [Transaction_channelId_fkey] FOREIGN KEY ([channelId]) REFERENCES [dbo].[Channel]([channelId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [Transaction_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[TransactionStatus]([statusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Import] ADD CONSTRAINT [Import_accountId_fkey] FOREIGN KEY ([accountId]) REFERENCES [dbo].[Account]([accountId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Import] ADD CONSTRAINT [Import_createdByUserId_fkey] FOREIGN KEY ([createdByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Import] ADD CONSTRAINT [Import_currentBatchId_fkey] FOREIGN KEY ([currentBatchId]) REFERENCES [dbo].[SettlementBatch]([batchId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImportFile] ADD CONSTRAINT [ImportFile_importId_fkey] FOREIGN KEY ([importId]) REFERENCES [dbo].[Import]([importId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImportSheet] ADD CONSTRAINT [ImportSheet_fileId_fkey] FOREIGN KEY ([fileId]) REFERENCES [dbo].[ImportFile]([fileId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImportSheet] ADD CONSTRAINT [ImportSheet_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[TransactionStatus]([statusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImportSheetColumnMap] ADD CONSTRAINT [ImportSheetColumnMap_sheetId_fkey] FOREIGN KEY ([sheetId]) REFERENCES [dbo].[ImportSheet]([sheetId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImportRow] ADD CONSTRAINT [ImportRow_sheetId_fkey] FOREIGN KEY ([sheetId]) REFERENCES [dbo].[ImportSheet]([sheetId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImportRow] ADD CONSTRAINT [ImportRow_transactionId_fkey] FOREIGN KEY ([transactionId]) REFERENCES [dbo].[Transaction]([transactionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImportRow] ADD CONSTRAINT [ImportRow_gatewayId_fkey] FOREIGN KEY ([gatewayId]) REFERENCES [dbo].[Gateway]([gatewayId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImportRow] ADD CONSTRAINT [ImportRow_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[TransactionStatus]([statusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImportRow] ADD CONSTRAINT [ImportRow_cycle_fkey] FOREIGN KEY ([cycle]) REFERENCES [dbo].[Cycle]([cycle]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ValidationRun] ADD CONSTRAINT [ValidationRun_importId_fkey] FOREIGN KEY ([importId]) REFERENCES [dbo].[Import]([importId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ValidationRun] ADD CONSTRAINT [ValidationRun_runByUserId_fkey] FOREIGN KEY ([runByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ValidationResult] ADD CONSTRAINT [ValidationResult_runId_fkey] FOREIGN KEY ([runId]) REFERENCES [dbo].[ValidationRun]([runId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [ValidationIssue_resultId_fkey] FOREIGN KEY ([resultId]) REFERENCES [dbo].[ValidationResult]([resultId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [ValidationIssue_transactionId_fkey] FOREIGN KEY ([transactionId]) REFERENCES [dbo].[Transaction]([transactionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [ValidationIssue_cycle_fkey] FOREIGN KEY ([cycle]) REFERENCES [dbo].[Cycle]([cycle]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [ValidationIssue_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[TransactionStatus]([statusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [ValidationIssue_detectedInBatchId_fkey] FOREIGN KEY ([detectedInBatchId]) REFERENCES [dbo].[SettlementBatch]([batchId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [ValidationIssue_resolvedInBatchId_fkey] FOREIGN KEY ([resolvedInBatchId]) REFERENCES [dbo].[SettlementBatch]([batchId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [ValidationIssue_resolvedByUserId_fkey] FOREIGN KEY ([resolvedByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConflictOccurrence] ADD CONSTRAINT [ConflictOccurrence_issueId_fkey] FOREIGN KEY ([issueId]) REFERENCES [dbo].[ValidationIssue]([issueId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConflictOccurrence] ADD CONSTRAINT [ConflictOccurrence_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[SettlementBatch]([batchId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConflictOccurrence] ADD CONSTRAINT [ConflictOccurrence_fileId_fkey] FOREIGN KEY ([fileId]) REFERENCES [dbo].[ImportFile]([fileId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConflictOccurrence] ADD CONSTRAINT [ConflictOccurrence_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[TransactionStatus]([statusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConflictOccurrence] ADD CONSTRAINT [ConflictOccurrence_changedByUserId_fkey] FOREIGN KEY ([changedByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatch] ADD CONSTRAINT [SettlementBatch_accountId_fkey] FOREIGN KEY ([accountId]) REFERENCES [dbo].[Account]([accountId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatch] ADD CONSTRAINT [SettlementBatch_importId_fkey] FOREIGN KEY ([importId]) REFERENCES [dbo].[Import]([importId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatch] ADD CONSTRAINT [SettlementBatch_approvedByUserId_fkey] FOREIGN KEY ([approvedByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatch] ADD CONSTRAINT [SettlementBatch_paidByUserId_fkey] FOREIGN KEY ([paidByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatch] ADD CONSTRAINT [SettlementBatch_undoneByUserId_fkey] FOREIGN KEY ([undoneByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatchFee] ADD CONSTRAINT [SettlementBatchFee_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[SettlementBatch]([batchId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatchFee] ADD CONSTRAINT [SettlementBatchFee_feeTypeId_fkey] FOREIGN KEY ([feeTypeId]) REFERENCES [dbo].[FeeType]([feeTypeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatchFee] ADD CONSTRAINT [SettlementBatchFee_feeId_fkey] FOREIGN KEY ([feeId]) REFERENCES [dbo].[Fee]([feeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatchFee] ADD CONSTRAINT [SettlementBatchFee_enteredByUserId_fkey] FOREIGN KEY ([enteredByUserId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatchTotal] ADD CONSTRAINT [SettlementBatchTotal_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[SettlementBatch]([batchId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementBatchBrandTotal] ADD CONSTRAINT [SettlementBatchBrandTotal_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[SettlementBatch]([batchId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementTransaction] ADD CONSTRAINT [SettlementTransaction_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[SettlementBatch]([batchId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementTransaction] ADD CONSTRAINT [SettlementTransaction_transactionId_fkey] FOREIGN KEY ([transactionId]) REFERENCES [dbo].[Transaction]([transactionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementTransaction] ADD CONSTRAINT [SettlementTransaction_cycle_fkey] FOREIGN KEY ([cycle]) REFERENCES [dbo].[Cycle]([cycle]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementTransaction] ADD CONSTRAINT [SettlementTransaction_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[TransactionStatus]([statusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementTransaction] ADD CONSTRAINT [SettlementTransaction_settlementStatusId_fkey] FOREIGN KEY ([settlementStatusId]) REFERENCES [dbo].[SettlementStatus]([settlementStatusId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementTransaction] ADD CONSTRAINT [SettlementTransaction_sheetId_fkey] FOREIGN KEY ([sheetId]) REFERENCES [dbo].[ImportSheet]([sheetId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementTransactionFee] ADD CONSTRAINT [SettlementTransactionFee_settlementTxnId_fkey] FOREIGN KEY ([settlementTxnId]) REFERENCES [dbo].[SettlementTransaction]([settlementTxnId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementTransactionFee] ADD CONSTRAINT [SettlementTransactionFee_feeId_fkey] FOREIGN KEY ([feeId]) REFERENCES [dbo].[Fee]([feeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SettlementTransactionFee] ADD CONSTRAINT [SettlementTransactionFee_feeTypeId_fkey] FOREIGN KEY ([feeTypeId]) REFERENCES [dbo].[FeeType]([feeTypeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([roleId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([roleId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserMerchant] ADD CONSTRAINT [UserMerchant_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserMerchant] ADD CONSTRAINT [UserMerchant_merchantId_fkey] FOREIGN KEY ([merchantId]) REFERENCES [dbo].[Merchant]([merchantId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([userId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
