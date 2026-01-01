
IF OBJECT_ID('dbo.DefaultReportMappings', 'U') IS NOT NULL DROP TABLE dbo.DefaultReportMappings;
CREATE TABLE DefaultReportMappings (
    id NVARCHAR(50) PRIMARY KEY,
    report_name NVARCHAR(255) NOT NULL,
    field_mapping_name NVARCHAR(255) NOT NULL,
    data_type NVARCHAR(50) DEFAULT 'String',
    is_required BIT DEFAULT 0,
    blanks_allowed NVARCHAR(20) DEFAULT 'Allowed'
);
CREATE INDEX IX_DefaultReportMappings_ReportName ON DefaultReportMappings(report_name);
