SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.Routines', 'row_version') IS NULL
BEGIN
    ALTER TABLE dbo.Routines ADD row_version ROWVERSION NOT NULL;
END;

IF COL_LENGTH('dbo.Users', 'TokenVersion') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD TokenVersion INT NOT NULL
        CONSTRAINT DF_Users_TokenVersion DEFAULT (1);
END;

IF COL_LENGTH('dbo.Users', 'IsActive') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD IsActive BIT NOT NULL
        CONSTRAINT DF_Users_IsActive DEFAULT (1);
END;

DECLARE @activityLogForeignKey sysname;
DECLARE @dropForeignKeySql nvarchar(max);
SELECT @activityLogForeignKey = fk.name
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables parentTable ON parentTable.object_id = fk.parent_object_id
JOIN sys.columns parentColumn
  ON parentColumn.object_id = fkc.parent_object_id
 AND parentColumn.column_id = fkc.parent_column_id
WHERE parentTable.name = 'ActivityLog'
  AND parentColumn.name = 'routine_id';

IF @activityLogForeignKey IS NOT NULL
BEGIN
    SELECT @dropForeignKeySql =
        N'ALTER TABLE dbo.ActivityLog DROP CONSTRAINT ' + QUOTENAME(@activityLogForeignKey);
    EXEC sp_executesql @dropForeignKeySql;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Routines_Name_Version'
      AND object_id = OBJECT_ID('dbo.Routines')
)
BEGIN
    CREATE INDEX IX_Routines_Name_Version ON dbo.Routines(routine_name, version);
END;

COMMIT TRANSACTION;
