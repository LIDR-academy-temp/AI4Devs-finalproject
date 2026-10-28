using HotChocolate;

namespace GraphApi.Models.Reports
{
    public sealed class ReportRequest
    {
        public string ReportId { get; set; } = string.Empty;
        public ReportOutputFormat OutputFormat { get; set; } = ReportOutputFormat.Html;
        public Dictionary<string, string>? Parameters { get; set; }
        public Dictionary<string, object?>? BodyReporte { get; set; }
    }

    public sealed class ReportResponse
    {
        public bool Success { get; set; }
        public string? ErrorCode { get; set; }
        public string? ErrorMessage { get; set; }
        public List<string>? ValidationErrors { get; set; }
        public ReportOutputFormat Format { get; set; }
        public string? Base64Content { get; set; }
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public int TotalRows { get; set; }
        public bool WasTruncated { get; set; }
        public long ElapsedMs { get; set; }
        public int DefinitionVersion { get; set; }
        public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
        public string? CorrelationId { get; set; }
    }

    public sealed class ReportErrorResponse
    {
        public string ErrorCode { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public List<string>? Details { get; set; }
        public string CorrelationId { get; set; } = string.Empty;
    }

    public sealed class ReportDefinition
    {
        public string ReportId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public ReportMode Mode { get; set; } = ReportMode.Tabular;
        public string DataSource { get; set; } = string.Empty;
        public DataSourceType DataSourceType { get; set; } = DataSourceType.StoredProcedure;
        public string? ConnectionKey { get; set; }
        public string? TemplateName { get; set; }
        public string ExportFilePrefix { get; set; } = "Reporte";
        public int MaxRows { get; set; } = 50_000;
        public PaperSize PaperSize { get; set; } = PaperSize.Letter;
        public PageOrientation Orientation { get; set; } = PageOrientation.Portrait;
        public int MarginMm { get; set; } = 12;
        public int DefinitionVersion { get; set; } = 1;
        public bool IsActive { get; set; } = true;
        public HashSet<string>? AllowedRoles { get; set; }
        public Dictionary<string, string>? ColumnTitles { get; set; }
        public Dictionary<string, string>? ColumnFormats { get; set; }
        public HashSet<string>? TotalColumns { get; set; }
        public List<ReportParameter> Parameters { get; set; } = new();
    }

    public sealed class ReportCatalogItem
    {
        public string ReportId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public ReportMode Mode { get; set; }
        public int DefinitionVersion { get; set; }
    }

    public sealed class ReportEngineOptions
    {
        public const string SectionName = "ReportEngine";

        public int MaxRowsDefault { get; set; } = 50_000;
        public int TemplateCacheMinutes { get; set; } = 20;
        public int CatalogCacheMinutes { get; set; } = 10;
        public int SqlTimeoutSeconds { get; set; } = 120;
        public string CultureName { get; set; } = "es-MX";
    }

    public sealed class ReportParameter
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public ReportParameterType ParameterType { get; set; } = ReportParameterType.Text;
        public bool IsRequired { get; set; }
        public string? DefaultValue { get; set; }
        public int? Min { get; set; }
        public int? Max { get; set; }
        public string? RegexPattern { get; set; }
        public string? DateRangeEndKey { get; set; }
        public string? ComboBoxQuery { get; set; }
        public List<ComboBoxOption> ComboBoxOptions { get; set; } = new();
    }

    public enum ReportOutputFormat
    {
        Html,
        Pdf,
        Excel
    }

    public enum ReportMode
    {
        Tabular,
        Document
    }

    public enum ReportParameterType
    {
        Text,
        Number,
        Date,
        DateRange,
        ComboBox,
        Boolean
    }

    public enum DataSourceType
    {
        StoredProcedure,
        View,
        Table,
        RawQuery
    }

    public enum PaperSize
    {
        Letter,
        A4,
        Legal
    }

    public enum PageOrientation
    {
        Portrait,
        Landscape
    }

    public sealed class ComboBoxOption
    {
        public string Value { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
    }
}