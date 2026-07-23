SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.Routines', 'review_status') IS NULL
BEGIN
    ALTER TABLE dbo.Routines ADD review_status NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Routines_ReviewStatus DEFAULT ('Reviewed') WITH VALUES;
END;

IF COL_LENGTH('dbo.Routines', 'last_changed_by_user_id') IS NULL
BEGIN
    ALTER TABLE dbo.Routines ADD last_changed_by_user_id INT NULL;
END;

IF COL_LENGTH('dbo.Routines', 'reviewed_by_user_id') IS NULL
BEGIN
    ALTER TABLE dbo.Routines ADD reviewed_by_user_id INT NULL;
END;

IF COL_LENGTH('dbo.Routines', 'reviewed_at') IS NULL
BEGIN
    ALTER TABLE dbo.Routines ADD reviewed_at DATETIME2 NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_Routines_ReviewStatus'
      AND parent_object_id = OBJECT_ID('dbo.Routines')
)
BEGIN
    ALTER TABLE dbo.Routines ADD CONSTRAINT CK_Routines_ReviewStatus
        CHECK (review_status IN ('Pending', 'Reviewed'));
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_Routines_LastChangedByUser'
      AND parent_object_id = OBJECT_ID('dbo.Routines')
)
BEGIN
    ALTER TABLE dbo.Routines ADD CONSTRAINT FK_Routines_LastChangedByUser
        FOREIGN KEY (last_changed_by_user_id) REFERENCES dbo.Users(Id);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_Routines_ReviewedByUser'
      AND parent_object_id = OBJECT_ID('dbo.Routines')
)
BEGIN
    ALTER TABLE dbo.Routines ADD CONSTRAINT FK_Routines_ReviewedByUser
        FOREIGN KEY (reviewed_by_user_id) REFERENCES dbo.Users(Id);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Routines_ReviewStatus_LastEdited'
      AND object_id = OBJECT_ID('dbo.Routines')
)
BEGIN
    CREATE INDEX IX_Routines_ReviewStatus_LastEdited
        ON dbo.Routines(review_status, last_edited_date DESC);
END;

COMMIT TRANSACTION;
