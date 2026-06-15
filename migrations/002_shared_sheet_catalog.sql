SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.SheetCatalog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SheetCatalog (
        id NVARCHAR(50) NOT NULL CONSTRAINT PK_SheetCatalog PRIMARY KEY,
        sheet_name NVARCHAR(255) NOT NULL,
        name_key NVARCHAR(255) NOT NULL,
        classification NVARCHAR(20) NOT NULL
            CONSTRAINT DF_SheetCatalog_Classification DEFAULT ('Unclassified'),
        global_order INT NOT NULL,
        row_version ROWVERSION NOT NULL,
        CONSTRAINT CK_SheetCatalog_Classification
            CHECK (classification IN ('Main', 'Helper', 'Unclassified'))
    );
END;

IF COL_LENGTH('dbo.OutputSheets', 'sheet_id') IS NULL
BEGIN
    ALTER TABLE dbo.OutputSheets ADD sheet_id NVARCHAR(50) NULL;
END;

;WITH logical_sheets AS (
    SELECT
        LOWER(LTRIM(RTRIM(sheet_name))) AS name_key,
        MIN(LTRIM(RTRIM(sheet_name))) AS sheet_name,
        MIN(COALESCE(NULLIF(order_index, 0), 2147483647)) AS observed_order
    FROM dbo.OutputSheets
    WHERE LTRIM(RTRIM(sheet_name)) <> ''
    GROUP BY LOWER(LTRIM(RTRIM(sheet_name)))
),
ordered_sheets AS (
    SELECT
        CONVERT(NVARCHAR(50), NEWID()) AS id,
        sheet_name,
        name_key,
        ROW_NUMBER() OVER (
            ORDER BY
                CASE WHEN observed_order = 2147483647 THEN 1 ELSE 0 END,
                observed_order,
                sheet_name
        ) AS global_order
    FROM logical_sheets
)
INSERT INTO dbo.SheetCatalog (id, sheet_name, name_key, classification, global_order)
SELECT id, sheet_name, name_key, 'Unclassified', global_order
FROM ordered_sheets source
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.SheetCatalog existing
    WHERE existing.name_key = source.name_key
);

UPDATE output
SET sheet_id = catalog.id
FROM dbo.OutputSheets output
JOIN dbo.SheetCatalog catalog
  ON catalog.name_key = LOWER(LTRIM(RTRIM(output.sheet_name)))
WHERE output.sheet_id IS NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_SheetCatalog_NameKey'
      AND object_id = OBJECT_ID('dbo.SheetCatalog')
)
BEGIN
    CREATE UNIQUE INDEX UX_SheetCatalog_NameKey ON dbo.SheetCatalog(name_key);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_OutputSheets_SheetCatalog'
)
BEGIN
    ALTER TABLE dbo.OutputSheets
    ADD CONSTRAINT FK_OutputSheets_SheetCatalog
        FOREIGN KEY (sheet_id) REFERENCES dbo.SheetCatalog(id);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_OutputSheets_SheetId'
      AND object_id = OBJECT_ID('dbo.OutputSheets')
)
BEGIN
    CREATE INDEX IX_OutputSheets_SheetId ON dbo.OutputSheets(sheet_id);
END;

COMMIT TRANSACTION;
