using System.Collections;
using System.Data;
using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Infrastructure.RequestContext;
using GraphApi.Models.Reports;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Path = System.IO.Path;
using KeyNotFoundException = System.Collections.Generic.KeyNotFoundException;

namespace GraphApi.Services.Reports
{
    public interface IReportService
    {
        Task<ReportResponse> GenerateAsync(ReportRequest request, RequestContextData context);
        Task<IEnumerable<ReportCatalogItem>> GetCatalogAsync();
        Task<ReportDefinition> GetDefinitionAsync(string reportId, RequestContextData context);
    }

    public interface IReportDataProvider
    {
        Task<object> GetDataAsync(ReportDefinition definition, Dictionary<string, string>? parameters, string connectionKey);
    }

    public interface ITemplateEngine
    {
        string Render(string templateName, object data, string? userName = null, string? title = null, int totalRows = 0, ReportDefinition? definition = null);
        string RenderFromString(string htmlTemplate, object data);
    }

    public interface IReportPdfGenerator
    {
        byte[] Generate(object data, ReportDefinition definition);
    }

    public interface IReportExcelGenerator
    {
        byte[] GenerateTabular(IReadOnlyList<IDictionary<string, object?>> rows, ReportDefinition definition);
        byte[] GenerateDocument(object data, ReportDefinition definition);
    }

    public interface ITabularHtmlGenerator
    {
        string Generate(IReadOnlyList<IDictionary<string, object?>> rows, ReportDefinition definition);
    }

    public interface IReportParameterValidator
    {
        List<string> Validate(ReportDefinition definition, Dictionary<string, string>? parameters);
    }

    public sealed class ReportCatalogProvider
    {
        private readonly Dictionary<string, ReportDefinition> _definitions = new(StringComparer.OrdinalIgnoreCase);

        public ReportCatalogProvider()
        {
            Register(new ReportDefinition
            {
                ReportId = "RPT-CQ500-CASAS",
                Title = "Casas del Condominio",
                Description = "Listado tabular de casas, condominios y propietarios",
                Category = "Fraccionamiento",
                Mode = ReportMode.Tabular,
                DataSource = "sgr.vsCasas",
                DataSourceType = DataSourceType.View,
                ExportFilePrefix = "CasasCondominio",
                ColumnTitles = new Dictionary<string, string>
                {
                    ["CasaID"] = "ID",
                    ["CondominioID"] = "Condominio ID",
                    ["NombreCondominio"] = "Condominio",
                    ["DireccionCondominio"] = "Direccion condominio",
                    ["DireccionCasa"] = "Direccion casa",
                    ["NumeroExtCasa"] = "No. exterior",
                    ["PropietarioUsuarioID"] = "Propietario ID",
                    ["NombrePropietario"] = "Propietario",
                    ["CorreoPropietario"] = "Correo",
                    ["TelefonoPropietario"] = "Telefono"
                }
            });

            Register(new ReportDefinition
            {
                ReportId = "RPT-CQ500-VISITAS-HOY",
                Title = "Visitas de Hoy",
                Description = "Visitas generadas en la fecha actual",
                Category = "Vigilancia",
                Mode = ReportMode.Tabular,
                DataSource = @"
SELECT
    VisitaGeneradaID,
    NombreVisitante,
    NombreVisitado,
    FechaEmision,
    FechaExpira,
    CodigoQR,
    bUsado
FROM vts.vsVisitasGeneradas WITH (NOLOCK)
WHERE bEliminado = 0
  AND CAST(FechaEmision AS date) = CAST(GETDATE() AS date)
ORDER BY FechaEmision DESC",
                DataSourceType = DataSourceType.RawQuery,
                ExportFilePrefix = "VisitasHoy",
                ColumnTitles = new Dictionary<string, string>
                {
                    ["VisitaGeneradaID"] = "ID",
                    ["NombreVisitante"] = "Visitante",
                    ["NombreVisitado"] = "Visitado",
                    ["FechaEmision"] = "Emitida",
                    ["FechaExpira"] = "Expira",
                    ["CodigoQR"] = "QR",
                    ["bUsado"] = "Usado"
                }
            });

            Register(new ReportDefinition
            {
                ReportId = "RPT-CQ500-RESERVACIONES-ACTIVAS",
                Title = "Reservaciones Activas",
                Description = "Reservaciones vigentes de areas comunes",
                Category = "Areas Comunes",
                Mode = ReportMode.Tabular,
                DataSource = @"
SELECT
    ReservacionAreaID,
    AreasComunes,
    NombreUsuario,
    FechaInicio,
    FechaFin,
    ReservacionEstado
FROM vts.vsReservacionesArea WITH (NOLOCK)
WHERE bEliminado = 0
  AND FechaInicio <= GETDATE()
  AND FechaFin >= GETDATE()
ORDER BY FechaInicio DESC",
                DataSourceType = DataSourceType.RawQuery,
                ExportFilePrefix = "ReservacionesActivas",
                ColumnTitles = new Dictionary<string, string>
                {
                    ["ReservacionAreaID"] = "ID",
                    ["AreasComunes"] = "Area comun",
                    ["NombreUsuario"] = "Usuario",
                    ["FechaInicio"] = "Inicio",
                    ["FechaFin"] = "Fin",
                    ["ReservacionEstado"] = "Estado"
                }
            });

            Register(new ReportDefinition
            {
                ReportId = "RPT-CQ500-TICKETS-ABIERTOS",
                Title = "Tickets Abiertos",
                Description = "Tickets pendientes de cierre",
                Category = "Soporte",
                Mode = ReportMode.Tabular,
                DataSource = @"
SELECT
    TicketID,
    TituloTicket,
    NombreSolicitante,
    PrioridadTicket,
    EstadoTicket,
    FechaCreacionTicket,
    FechaCierre
FROM tkt.vsTickets WITH (NOLOCK)
WHERE bEliminado = 0
  AND EstadoTicket NOT IN (N'Cerrado', N'Finalizado', N'Resuelto', N'Cancelado', N'Cancelada')
ORDER BY FechaCreacionTicket DESC",
                DataSourceType = DataSourceType.RawQuery,
                ExportFilePrefix = "TicketsAbiertos",
                ColumnTitles = new Dictionary<string, string>
                {
                    ["TicketID"] = "ID",
                    ["TituloTicket"] = "Titulo",
                    ["NombreSolicitante"] = "Solicitante",
                    ["PrioridadTicket"] = "Prioridad",
                    ["EstadoTicket"] = "Estado",
                    ["FechaCreacionTicket"] = "Creado",
                    ["FechaCierre"] = "Cierre"
                }
            });

            Register(new ReportDefinition
            {
                ReportId = "RPT-CQ500-CUOTAS-PENDIENTES",
                Title = "Cuotas Pendientes",
                Description = "Cuotas no pagadas del fraccionamiento",
                Category = "Finanzas",
                Mode = ReportMode.Tabular,
                DataSource = @"
SELECT
    CuotaID,
    UsuarioID,
    CasaID,
    Monto,
    PeriodoInicio,
    PeriodoFin,
    FechaVencimiento,
    Pagado,
    FechaPago,
    MetodoPago,
    ReferenciaPago
FROM fnz.Cuotas WITH (NOLOCK)
WHERE bEliminado = 0
  AND Pagado = 0
ORDER BY FechaVencimiento DESC",
                DataSourceType = DataSourceType.RawQuery,
                ExportFilePrefix = "CuotasPendientes",
                ColumnTitles = new Dictionary<string, string>
                {
                    ["CuotaID"] = "ID",
                    ["UsuarioID"] = "Usuario ID",
                    ["CasaID"] = "Casa ID",
                    ["Monto"] = "Monto",
                    ["PeriodoInicio"] = "Periodo inicio",
                    ["PeriodoFin"] = "Periodo fin",
                    ["FechaVencimiento"] = "Vencimiento",
                    ["Pagado"] = "Pagado",
                    ["FechaPago"] = "Fecha pago",
                    ["MetodoPago"] = "Metodo de pago",
                    ["ReferenciaPago"] = "Referencia"
                }
            });

            Register(new ReportDefinition
            {
                ReportId = "DOC-CQ500-RESUMEN-OPERATIVO",
                Title = "Resumen Operativo del Fraccionamiento",
                Description = "Documento ejecutivo con indicadores clave del condominio",
                Category = "Fraccionamiento",
                Mode = ReportMode.Document,
                DataSource = @"
SELECT
    (SELECT COUNT(*) FROM sgr.Condominios WITH (NOLOCK) WHERE bEliminado = 0) AS TotalCondominios,
    (SELECT COUNT(*) FROM sgr.Casas WITH (NOLOCK) WHERE bEliminado = 0) AS TotalCasas,
    (SELECT COUNT(*) FROM sgr.Usuarios WITH (NOLOCK) WHERE bEliminado = 0 AND bActivoUsuario = 1) AS UsuariosActivos,
    (SELECT COUNT(*) FROM sgr.Usuarios WITH (NOLOCK) WHERE bEliminado = 0 AND bAdministrador = 1) AS Administradores,
    (SELECT COUNT(*) FROM vts.Visitas WITH (NOLOCK) WHERE bEliminado = 0 AND CAST(FechaEntrada AS date) = CAST(GETDATE() AS date)) AS VisitasHoy,
    (SELECT COUNT(*) FROM vts.Visitas WITH (NOLOCK) WHERE bEliminado = 0 AND FechaSalida IS NULL) AS VisitasAbiertas,
    (SELECT COUNT(*) FROM vts.ReservacionesArea ra WITH (NOLOCK)
      INNER JOIN vts.ReservacionesEstados re WITH (NOLOCK) ON re.ReservacionEstadoID = ra.ReservacionEstadoID
      WHERE ra.bEliminado = 0
        AND ra.FechaInicio <= GETDATE()
        AND ra.FechaFin >= GETDATE()
        AND re.ReservacionEstado NOT IN (N'Cancelada', N'Cancelado', N'Rechazada', N'Rechazado')) AS ReservacionesActivas,
    (SELECT COUNT(*) FROM tkt.Tickets t WITH (NOLOCK)
      INNER JOIN tkt.EstadosTickets e WITH (NOLOCK) ON e.EstadoTicketID = t.EstadoTicketID
      WHERE t.bEliminado = 0
        AND e.EstadoTicket NOT IN (N'Cerrado', N'Finalizado', N'Resuelto', N'Cancelado', N'Cancelada')) AS TicketsAbiertos,
    (SELECT COUNT(*) FROM fnz.Cuotas WITH (NOLOCK) WHERE bEliminado = 0 AND Pagado = 0) AS CuotasPendientes,
    (SELECT COUNT(*) FROM ntf.Notificaciones WITH (NOLOCK) WHERE bEliminado = 0 AND Leido = 0) AS NotificacionesNoLeidas,
    (SELECT COUNT(*) FROM jnt.Juntas WITH (NOLOCK) WHERE bEliminado = 0 AND bActivo = 1) AS JuntasActivas,
    (SELECT COUNT(*) FROM vts.AreasComunes WITH (NOLOCK) WHERE bEliminado = 0) AS AreasComunes,
    (SELECT COUNT(*) FROM anm.Anuncios WITH (NOLOCK)
      WHERE bEliminado = 0
        AND FechaPublicacion <= GETDATE()
        AND (VigenteHasta IS NULL OR VigenteHasta >= GETDATE())) AS AnunciosVigentes,
    (SELECT TOP 1 NombreCondominio FROM sgr.vsCasas WITH (NOLOCK) WHERE bEliminado = 0 ORDER BY CasaID) AS NombreCondominio,
    (SELECT TOP 1 DireccionCondominio FROM sgr.vsCasas WITH (NOLOCK) WHERE bEliminado = 0 ORDER BY CasaID) AS DireccionCondominio",
                DataSourceType = DataSourceType.RawQuery,
                TemplateName = "document/fraccionamiento/resumen_operativo.html",
                ExportFilePrefix = "ResumenOperativoCQ500",
                PaperSize = PaperSize.Letter,
                Orientation = PageOrientation.Portrait
            });

            Register(new ReportDefinition
            {
                ReportId = "DOC-CQ500-AUTORIZACION-VISITA",
                Title = "Autorizacion de Visita",
                Description = "Documento de autorizacion para acceso de visitante",
                Category = "Vigilancia",
                Mode = ReportMode.Document,
                DataSource = "SELECT 1 AS Control",
                DataSourceType = DataSourceType.RawQuery,
                TemplateName = "document/fraccionamiento/autorizacion_visita.html",
                ExportFilePrefix = "AutorizacionVisitaCQ500",
                PaperSize = PaperSize.Letter,
                Orientation = PageOrientation.Portrait
            });
        }

        public IReadOnlyCollection<ReportCatalogItem> GetCatalog()
            => _definitions.Values
                .Where(d => d.IsActive)
                .Select(d => new ReportCatalogItem
                {
                    ReportId = d.ReportId,
                    Title = d.Title,
                    Category = d.Category,
                    Mode = d.Mode,
                    DefinitionVersion = d.DefinitionVersion
                })
                .ToList();

        public ReportDefinition? GetDefinition(string reportId)
        {
            _definitions.TryGetValue(reportId, out var definition);
            return definition;
        }

        private void Register(ReportDefinition definition)
        {
            _definitions[definition.ReportId] = definition;
        }
    }

    public sealed class ReportDataProviderService : IReportDataProvider
    {
        private readonly IConnectionFactory _connectionFactory;

        public ReportDataProviderService(IConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<object> GetDataAsync(ReportDefinition definition, Dictionary<string, string>? parameters, string connectionKey)
        {
            using IDbConnection connection = _connectionFactory.Create(connectionKey);

            var commandParameters = new DynamicParameters();
            foreach (var (key, value) in parameters ?? new Dictionary<string, string>())
            {
                commandParameters.Add(key.TrimStart('@'), value);
            }

            string sql;
            CommandType commandType;

            switch (definition.DataSourceType)
            {
                case DataSourceType.StoredProcedure:
                    sql = definition.DataSource;
                    commandType = CommandType.StoredProcedure;
                    break;
                case DataSourceType.View:
                case DataSourceType.Table:
                    sql = $"SELECT * FROM {definition.DataSource}";
                    commandType = CommandType.Text;
                    break;
                case DataSourceType.RawQuery:
                    sql = definition.DataSource;
                    commandType = CommandType.Text;
                    break;
                default:
                    throw new InvalidOperationException($"DataSourceType no soportado: {definition.DataSourceType}");
            }

            var rows = (await connection.QueryAsync(sql, commandParameters, commandType: commandType))
                .Select(row => (IDictionary<string, object?>)row)
                .Select(row => new Dictionary<string, object?>(row, StringComparer.OrdinalIgnoreCase))
                .Cast<IDictionary<string, object?>>()
                .ToList();

            if (definition.Mode == ReportMode.Tabular)
            {
                return rows;
            }

            var model = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
            {
                ["Rows"] = rows,
                ["TotalRows"] = rows.Count
            };

            if (rows.Count > 0)
            {
                foreach (var (key, value) in rows[0])
                {
                    model[key] = value;
                }
            }

            return model;
        }
    }

    public sealed class TemplateEngineService : ITemplateEngine
    {
        private static readonly Regex RxIf = new(@"\{\{#if\s+([\w\.]+)\}\}([\s\S]*?)(?:\{\{#else\}\}([\s\S]*?))?\{\{/if\}\}", RegexOptions.Compiled);
        private static readonly Regex RxLoop = new(@"\{\{#([\w\.]+)\}\}([\s\S]*?)\{\{/\1\}\}", RegexOptions.Compiled);
        private static readonly Regex RxPlaceholder = new(@"\{\{([\w\._]+)(?::([^\}]+))?\}\}", RegexOptions.Compiled);
        private static readonly Regex RxStyles = new(@"<!--STYLES-->([\s\S]*?)<!--/STYLES-->", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private readonly string _templatesPath;
        private readonly IMemoryCache _cache;
        private readonly IOptions<ReportEngineOptions> _options;

        private string? _currentUser;
        private string? _currentTitle;
        private int _currentTotalRows;

        public TemplateEngineService(IWebHostEnvironment environment, IMemoryCache cache, IOptions<ReportEngineOptions> options)
        {
            _templatesPath = Path.Combine(environment.ContentRootPath, "Resources", "ReportTemplates");
            _cache = cache;
            _options = options;
        }

        public string Render(string templateName, object data, string? userName = null, string? title = null, int totalRows = 0, ReportDefinition? definition = null)
        {
            _currentUser = userName;
            _currentTitle = title;
            _currentTotalRows = totalRows;

            var templatePath = Path.Combine(_templatesPath, templateName);
            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException($"Template no encontrado: {templateName}", templatePath);
            }

            var html = _cache.GetOrCreate($"template_{templateName}", entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_options.Value.TemplateCacheMinutes);
                return File.ReadAllText(templatePath, Encoding.UTF8);
            })!;

            html = ApplyBaseLayout(html, definition);

            var root = ObjectToDictionary(data);
            root["_Now"] = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss", CultureInfo.InvariantCulture);
            root["_Date"] = DateTime.Now.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
            root["_Time"] = DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture);
            root["_Year"] = DateTime.Now.Year;
            root["_UserName"] = string.IsNullOrWhiteSpace(_currentUser) ? "N/A" : _currentUser;
            root["_ReportTitle"] = _currentTitle ?? string.Empty;
            root["_TotalRows"] = _currentTotalRows;

            return ProcessTemplate(html, root);
        }

        public string RenderFromString(string htmlTemplate, object data)
        {
            return ProcessTemplate(htmlTemplate, ObjectToDictionary(data));
        }

        private string ApplyBaseLayout(string childHtml, ReportDefinition? definition)
        {
            if (childHtml.TrimStart().StartsWith("<!DOCTYPE html>", StringComparison.OrdinalIgnoreCase))
            {
                return childHtml;
            }

            var basePath = Path.Combine(_templatesPath, "_base.html");
            if (!File.Exists(basePath))
            {
                return childHtml;
            }

            var baseHtml = _cache.GetOrCreate("template___base", entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_options.Value.TemplateCacheMinutes);
                return File.ReadAllText(basePath, Encoding.UTF8);
            })!;

            var extraStyles = string.Empty;
            var stylesMatch = RxStyles.Match(childHtml);
            if (stylesMatch.Success)
            {
                extraStyles = stylesMatch.Groups[1].Value;
                childHtml = RxStyles.Replace(childHtml, string.Empty);
            }

            baseHtml = baseHtml.Replace("{{_EXTRA_STYLES_}}", extraStyles, StringComparison.OrdinalIgnoreCase);
            baseHtml = baseHtml.Replace("{{_CONTENT_}}", childHtml, StringComparison.OrdinalIgnoreCase);
            baseHtml = baseHtml.Replace("{{_PaperSize}}", definition?.PaperSize.ToString() ?? "Letter", StringComparison.OrdinalIgnoreCase);
            baseHtml = baseHtml.Replace("{{_Orientation}}", definition?.Orientation.ToString().ToLowerInvariant() ?? "portrait", StringComparison.OrdinalIgnoreCase);
            baseHtml = baseHtml.Replace("{{_Margins}}", $"{definition?.MarginMm ?? 12}mm", StringComparison.OrdinalIgnoreCase);

            return baseHtml;
        }

        private static string ProcessTemplate(string html, Dictionary<string, object?> context)
        {
            html = ProcessConditionals(html, context);
            html = ProcessLoops(html, context);
            html = ReplacePlaceholders(html, context);
            return html;
        }

        private static string ProcessConditionals(string html, Dictionary<string, object?> context)
        {
            return RxIf.Replace(html, match =>
            {
                var key = match.Groups[1].Value;
                var trueBlock = match.Groups[2].Value;
                var falseBlock = match.Groups[3].Success ? match.Groups[3].Value : string.Empty;
                return IsTruthy(ResolvePath(context, key)) ? trueBlock : falseBlock;
            });
        }

        private static string ProcessLoops(string html, Dictionary<string, object?> context)
        {
            return RxLoop.Replace(html, match =>
            {
                var key = match.Groups[1].Value;
                var block = match.Groups[2].Value;
                var value = ResolvePath(context, key);

                if (value is not IEnumerable list || value is string)
                {
                    return string.Empty;
                }

                var result = new StringBuilder();
                var index = 0;

                foreach (var item in list)
                {
                    index++;
                    var child = ObjectToDictionary(item);
                    child["_Index"] = index;
                    foreach (var (k, v) in context)
                    {
                        child.TryAdd(k, v);
                    }

                    result.Append(ReplacePlaceholders(block, child));
                }

                return result.ToString();
            });
        }

        private static string ReplacePlaceholders(string html, Dictionary<string, object?> context)
        {
            return RxPlaceholder.Replace(html, match =>
            {
                var key = match.Groups[1].Value;
                var format = match.Groups[2].Success ? match.Groups[2].Value : null;
                var value = ResolvePath(context, key);

                if (value is null)
                {
                    return string.Empty;
                }

                if (!string.IsNullOrWhiteSpace(format) && value is IFormattable formattable)
                {
                    try
                    {
                        return formattable.ToString(format, CultureInfo.GetCultureInfo("es-MX"));
                    }
                    catch
                    {
                        return value.ToString() ?? string.Empty;
                    }
                }

                return value.ToString() ?? string.Empty;
            });
        }

        private static object? ResolvePath(Dictionary<string, object?> dict, string path)
        {
            var segments = path.Split('.', StringSplitOptions.RemoveEmptyEntries);
            object? current = dict;

            foreach (var segment in segments)
            {
                if (current is Dictionary<string, object?> currentDict)
                {
                    if (!currentDict.TryGetValue(segment, out current))
                    {
                        return null;
                    }

                    continue;
                }

                if (current is IDictionary<string, object?> currentMap)
                {
                    if (!currentMap.TryGetValue(segment, out current))
                    {
                        return null;
                    }

                    continue;
                }

                var property = current?.GetType().GetProperty(segment);
                current = property?.GetValue(current!);
            }

            return current;
        }

        private static Dictionary<string, object?> ObjectToDictionary(object? obj)
        {
            if (obj is null)
            {
                return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            }

            if (obj is Dictionary<string, object?> directDictionary)
            {
                return new Dictionary<string, object?>(directDictionary, StringComparer.OrdinalIgnoreCase);
            }

            if (obj is IDictionary<string, object?> map)
            {
                return map.ToDictionary(k => k.Key, v => v.Value, StringComparer.OrdinalIgnoreCase);
            }

            return obj.GetType()
                .GetProperties()
                .ToDictionary(p => p.Name, p => p.GetValue(obj), StringComparer.OrdinalIgnoreCase);
        }

        private static bool IsTruthy(object? value)
        {
            return value switch
            {
                null => false,
                bool b => b,
                string s => !string.IsNullOrWhiteSpace(s),
                int i => i != 0,
                long l => l != 0,
                decimal d => d != 0,
                double dbl => Math.Abs(dbl) > 0,
                _ => true
            };
        }
    }

    public sealed class ReportPdfGeneratorService : IReportPdfGenerator
    {
        public byte[] Generate(object data, ReportDefinition definition)
        {
            var rows = ExtractRows(data);
            var dict = data as IDictionary<string, object?>;

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(20);
                    page.Size(GetPageSize(definition.PaperSize, definition.Orientation));
                    page.Header().Text(definition.Title).SemiBold().FontSize(14);
                    page.Content().PaddingVertical(8).Column(col =>
                    {
                        if (rows is not null)
                        {
                            col.Item().Table(table =>
                            {
                                var columns = rows.Count == 0 ? new List<string>() : rows[0].Keys.ToList();
                                table.ColumnsDefinition(c =>
                                {
                                    foreach (var _ in columns)
                                    {
                                        c.RelativeColumn();
                                    }
                                });

                                foreach (var column in columns)
                                {
                                    table.Cell().Element(HeaderStyle).Text(column);
                                }

                                foreach (var row in rows)
                                {
                                    foreach (var column in columns)
                                    {
                                        row.TryGetValue(column, out var value);
                                        table.Cell().Element(CellStyle).Text(value?.ToString() ?? string.Empty);
                                    }
                                }
                            });
                        }
                        else if (dict is not null)
                        {
                            foreach (var (key, value) in dict)
                            {
                                if (string.Equals(key, "Rows", StringComparison.OrdinalIgnoreCase))
                                {
                                    continue;
                                }

                                col.Item().Text($"{key}: {value}");
                            }
                        }
                        else
                        {
                            col.Item().Text("Sin datos para renderizar.");
                        }
                    });
                    page.Footer().AlignRight().Text(text =>
                    {
                        text.Span("Generado: ");
                        text.Span(DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
                    });
                });
            }).GeneratePdf();
        }

        private static IReadOnlyList<IDictionary<string, object?>>? ExtractRows(object data)
        {
            if (data is IReadOnlyList<IDictionary<string, object?>> rows)
            {
                return rows;
            }

            if (data is IDictionary<string, object?> dict &&
                dict.TryGetValue("Rows", out var rowsValue) &&
                rowsValue is IReadOnlyList<IDictionary<string, object?>> nestedRows)
            {
                return nestedRows;
            }

            return null;
        }

        private static PageSize GetPageSize(PaperSize paperSize, PageOrientation orientation)
        {
            var size = paperSize switch
            {
                PaperSize.A4 => PageSizes.A4,
                PaperSize.Legal => PageSizes.Legal,
                _ => PageSizes.Letter
            };

            return orientation == PageOrientation.Landscape ? size.Landscape() : size;
        }

        private static IContainer HeaderStyle(IContainer container)
            => container.Background(Colors.Grey.Lighten2).Padding(4).Border(1).BorderColor(Colors.Grey.Lighten1);

        private static IContainer CellStyle(IContainer container)
            => container.Padding(4).BorderBottom(1).BorderColor(Colors.Grey.Lighten3);
    }

    public sealed class ReportExcelGeneratorService : IReportExcelGenerator
    {
        public byte[] GenerateTabular(IReadOnlyList<IDictionary<string, object?>> rows, ReportDefinition definition)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Reporte");

            var columns = rows.Count == 0 ? new List<string>() : rows[0].Keys.ToList();
            var titles = definition.ColumnTitles ?? new Dictionary<string, string>();

            for (var i = 0; i < columns.Count; i++)
            {
                worksheet.Cell(1, i + 1).Value = titles.TryGetValue(columns[i], out var title) ? title : columns[i];
                worksheet.Cell(1, i + 1).Style.Font.Bold = true;
            }

            for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
            {
                var row = rows[rowIndex];
                for (var colIndex = 0; colIndex < columns.Count; colIndex++)
                {
                    row.TryGetValue(columns[colIndex], out var value);
                    worksheet.Cell(rowIndex + 2, colIndex + 1).Value = value?.ToString();
                }
            }

            worksheet.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return ms.ToArray();
        }

        public byte[] GenerateDocument(object data, ReportDefinition definition)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Documento");

            var rows = ExtractRows(data);
            if (rows is not null)
            {
                var columns = rows.Count == 0 ? new List<string>() : rows[0].Keys.ToList();

                for (var i = 0; i < columns.Count; i++)
                {
                    worksheet.Cell(1, i + 1).Value = columns[i];
                    worksheet.Cell(1, i + 1).Style.Font.Bold = true;
                }

                for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
                {
                    var row = rows[rowIndex];
                    for (var colIndex = 0; colIndex < columns.Count; colIndex++)
                    {
                        row.TryGetValue(columns[colIndex], out var value);
                        worksheet.Cell(rowIndex + 2, colIndex + 1).Value = value?.ToString();
                    }
                }
            }
            else
            {
                var dict = data as IDictionary<string, object?>
                    ?? data.GetType().GetProperties()
                        .ToDictionary(p => p.Name, p => p.GetValue(data));

                var row = 1;
                foreach (var (key, value) in dict)
                {
                    if (string.Equals(key, "Rows", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    worksheet.Cell(row, 1).Value = key;
                    worksheet.Cell(row, 1).Style.Font.Bold = true;
                    worksheet.Cell(row, 2).Value = value?.ToString() ?? string.Empty;
                    row++;
                }
            }

            worksheet.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return ms.ToArray();
        }

        private static IReadOnlyList<IDictionary<string, object?>>? ExtractRows(object data)
        {
            if (data is IReadOnlyList<IDictionary<string, object?>> rows)
            {
                return rows;
            }

            if (data is IDictionary<string, object?> dict &&
                dict.TryGetValue("Rows", out var rowsValue) &&
                rowsValue is IReadOnlyList<IDictionary<string, object?>> nestedRows)
            {
                return nestedRows;
            }

            return null;
        }
    }

    public sealed class TabularHtmlGeneratorService : ITabularHtmlGenerator
    {
        public string Generate(IReadOnlyList<IDictionary<string, object?>> rows, ReportDefinition definition)
        {
            var columns = rows.Count == 0
                ? new List<string>()
                : rows[0].Keys.ToList();

            var columnTitles = definition.ColumnTitles ?? new Dictionary<string, string>();

            var builder = new StringBuilder();
            builder.AppendLine("<!DOCTYPE html>");
            builder.AppendLine("<html><head><meta charset=\"utf-8\" /><title>" + WebUtility.HtmlEncode(definition.Title) + "</title>");
            builder.AppendLine("<style>body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;margin:20px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:6px;}th{background:#f3f3f3;text-align:left;}td.num{text-align:right;}</style>");
            builder.AppendLine("</head><body>");
            builder.AppendLine("<h2>" + WebUtility.HtmlEncode(definition.Title) + "</h2>");
            builder.AppendLine("<table><thead><tr>");

            foreach (var column in columns)
            {
                var title = columnTitles.TryGetValue(column, out var customTitle) ? customTitle : column;
                builder.Append("<th>").Append(WebUtility.HtmlEncode(title)).AppendLine("</th>");
            }

            builder.AppendLine("</tr></thead><tbody>");

            foreach (var row in rows)
            {
                builder.AppendLine("<tr>");
                foreach (var column in columns)
                {
                    row.TryGetValue(column, out var value);
                    var text = FormatValue(value, definition.ColumnFormats?.GetValueOrDefault(column));
                    var cssClass = IsNumeric(value) ? "num" : string.Empty;
                    builder.Append("<td class=\"").Append(cssClass).Append("\">")
                        .Append(WebUtility.HtmlEncode(text))
                        .AppendLine("</td>");
                }
                builder.AppendLine("</tr>");
            }

            builder.AppendLine("</tbody></table>");
            builder.AppendLine("</body></html>");
            return builder.ToString();
        }

        private static bool IsNumeric(object? value)
            => value is sbyte or byte or short or ushort or int or uint or long or ulong or float or double or decimal;

        private static string FormatValue(object? value, string? format)
        {
            if (value is null)
            {
                return string.Empty;
            }

            if (!string.IsNullOrWhiteSpace(format) && value is IFormattable formattable)
            {
                return formattable.ToString(format, null);
            }

            return value.ToString() ?? string.Empty;
        }
    }

    public sealed class ReportParameterValidatorService : IReportParameterValidator
    {
        public List<string> Validate(ReportDefinition definition, Dictionary<string, string>? parameters)
        {
            var errors = new List<string>();
            parameters ??= new Dictionary<string, string>();

            foreach (var parameter in definition.Parameters)
            {
                parameters.TryGetValue(parameter.Key, out var value);
                value ??= parameter.DefaultValue;

                if (parameter.IsRequired && string.IsNullOrWhiteSpace(value))
                {
                    errors.Add($"El parámetro '{parameter.Label}' es obligatorio.");
                    continue;
                }

                if (string.IsNullOrWhiteSpace(value))
                {
                    continue;
                }

                if (parameter.ParameterType == ReportParameterType.Number)
                {
                    if (!decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var number))
                    {
                        errors.Add($"El parámetro '{parameter.Label}' debe ser numerico.");
                        continue;
                    }

                    if (parameter.Min.HasValue && number < parameter.Min.Value)
                    {
                        errors.Add($"El parámetro '{parameter.Label}' debe ser mayor o igual a {parameter.Min.Value}.");
                    }

                    if (parameter.Max.HasValue && number > parameter.Max.Value)
                    {
                        errors.Add($"El parámetro '{parameter.Label}' debe ser menor o igual a {parameter.Max.Value}.");
                    }
                }

                if (parameter.ParameterType == ReportParameterType.Date && !DateTime.TryParse(value, out _))
                {
                    errors.Add($"El parámetro '{parameter.Label}' debe ser una fecha valida.");
                }

                if (!string.IsNullOrWhiteSpace(parameter.RegexPattern) && !Regex.IsMatch(value, parameter.RegexPattern))
                {
                    errors.Add($"El parámetro '{parameter.Label}' no cumple el formato esperado.");
                }

                if (parameter.ParameterType == ReportParameterType.DateRange && !string.IsNullOrWhiteSpace(parameter.DateRangeEndKey))
                {
                    parameters.TryGetValue(parameter.DateRangeEndKey, out var endValue);
                    if (!DateTime.TryParse(value, out var startDate) || !DateTime.TryParse(endValue, out var endDate))
                    {
                        errors.Add($"El rango de fechas para '{parameter.Label}' es invalido.");
                    }
                    else if (startDate > endDate)
                    {
                        errors.Add($"La fecha inicial de '{parameter.Label}' no puede ser mayor a la fecha final.");
                    }
                }
            }

            return errors;
        }
    }

    public sealed class ReportService : IReportService
    {
        private readonly IReportDataProvider _dataProvider;
        private readonly ITemplateEngine _templateEngine;
        private readonly ITabularHtmlGenerator _tabularHtmlGenerator;
        private readonly IReportExcelGenerator _excelGenerator;
        private readonly IReportPdfGenerator _pdfGenerator;
        private readonly ReportCatalogProvider _catalog;
        private readonly IReportParameterValidator _validator;
        private readonly IConnectionFactory _connectionFactory;
        private readonly IMemoryCache _cache;
        private readonly IOptions<ReportEngineOptions> _options;

        public ReportService(
            IReportDataProvider dataProvider,
            ITemplateEngine templateEngine,
            ITabularHtmlGenerator tabularHtmlGenerator,
            IReportExcelGenerator excelGenerator,
            IReportPdfGenerator pdfGenerator,
            ReportCatalogProvider catalog,
            IReportParameterValidator validator,
            IConnectionFactory connectionFactory,
            IMemoryCache cache,
            IOptions<ReportEngineOptions> options)
        {
            _dataProvider = dataProvider;
            _templateEngine = templateEngine;
            _tabularHtmlGenerator = tabularHtmlGenerator;
            _excelGenerator = excelGenerator;
            _pdfGenerator = pdfGenerator;
            _catalog = catalog;
            _validator = validator;
            _connectionFactory = connectionFactory;
            _cache = cache;
            _options = options;
        }

        public async Task<ReportResponse> GenerateAsync(ReportRequest request, RequestContextData context)
        {
            var watch = System.Diagnostics.Stopwatch.StartNew();

            var definition = _catalog.GetDefinition(request.ReportId)
                ?? throw new KeyNotFoundException($"Reporte no encontrado: {request.ReportId}");

            var validationErrors = _validator.Validate(definition, request.Parameters);
            if (validationErrors.Count > 0)
            {
                return new ReportResponse
                {
                    Success = false,
                    ErrorCode = "REPORT_PARAMETER_INVALID",
                    ErrorMessage = "Parámetros invalidos.",
                    ValidationErrors = validationErrors,
                    DefinitionVersion = definition.DefinitionVersion,
                    GeneratedAtUtc = DateTime.UtcNow
                };
            }

            object rawData;
            if (definition.Mode == ReportMode.Document && request.BodyReporte is { Count: > 0 })
            {
                rawData = NormalizeBodyReporte(request.BodyReporte);
            }
            else
            {
                var connectionKey = definition.ConnectionKey ?? context.EnvironmentKey;
                rawData = await _dataProvider.GetDataAsync(definition, request.Parameters, connectionKey);
            }

            ReportResponse response = definition.Mode switch
            {
                ReportMode.Tabular => GenerateTabular(rawData, definition, request.OutputFormat),
                ReportMode.Document => GenerateDocument(rawData, definition, request.OutputFormat, context),
                _ => throw new InvalidOperationException($"Modo no soportado: {definition.Mode}")
            };

            watch.Stop();
            response.ElapsedMs = watch.ElapsedMilliseconds;
            response.DefinitionVersion = definition.DefinitionVersion;
            response.GeneratedAtUtc = DateTime.UtcNow;
            return response;
        }

        public async Task<IEnumerable<ReportCatalogItem>> GetCatalogAsync()
        {
            return await _cache.GetOrCreateAsync("report_catalog", entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_options.Value.CatalogCacheMinutes);
                return Task.FromResult(_catalog.GetCatalog().AsEnumerable());
            }) ?? Enumerable.Empty<ReportCatalogItem>();
        }

        public async Task<ReportDefinition> GetDefinitionAsync(string reportId, RequestContextData context)
        {
            var definition = _catalog.GetDefinition(reportId)
                ?? throw new KeyNotFoundException($"Reporte no encontrado: {reportId}");

            var connectionKey = definition.ConnectionKey ?? context.EnvironmentKey;

            foreach (var parameter in definition.Parameters)
            {
                if (parameter.ParameterType != ReportParameterType.ComboBox || string.IsNullOrWhiteSpace(parameter.ComboBoxQuery))
                {
                    continue;
                }

                if (parameter.ComboBoxOptions.Count > 0)
                {
                    continue;
                }

                using var connection = _connectionFactory.Create(connectionKey);
                var rows = await connection.QueryAsync<ComboBoxOption>(parameter.ComboBoxQuery);
                parameter.ComboBoxOptions = rows.ToList();
            }

            return definition;
        }

        private ReportResponse GenerateTabular(object rawData, ReportDefinition definition, ReportOutputFormat format)
        {
            var rows = (rawData as IReadOnlyList<IDictionary<string, object?>>) ?? new List<IDictionary<string, object?>>();

            var maxRows = definition.MaxRows <= 0 ? _options.Value.MaxRowsDefault : definition.MaxRows;
            var truncated = rows.Count > maxRows;
            if (truncated)
            {
                rows = rows.Take(maxRows).ToList();
            }

            return format switch
            {
                ReportOutputFormat.Html => new ReportResponse
                {
                    Success = true,
                    Format = ReportOutputFormat.Html,
                    Base64Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(_tabularHtmlGenerator.Generate(rows, definition))),
                    FileName = $"{definition.ExportFilePrefix}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.html",
                    ContentType = "text/html",
                    TotalRows = rows.Count,
                    WasTruncated = truncated
                },
                ReportOutputFormat.Pdf => new ReportResponse
                {
                    Success = true,
                    Format = ReportOutputFormat.Pdf,
                    Base64Content = Convert.ToBase64String(_pdfGenerator.Generate(rows, definition)),
                    FileName = $"{definition.ExportFilePrefix}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.pdf",
                    ContentType = "application/pdf",
                    TotalRows = rows.Count,
                    WasTruncated = truncated
                },
                ReportOutputFormat.Excel => new ReportResponse
                {
                    Success = true,
                    Format = ReportOutputFormat.Excel,
                    Base64Content = Convert.ToBase64String(_excelGenerator.GenerateTabular(rows, definition)),
                    FileName = $"{definition.ExportFilePrefix}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx",
                    ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    TotalRows = rows.Count,
                    WasTruncated = truncated
                },
                _ => throw new ArgumentOutOfRangeException(nameof(format))
            };
        }

        private ReportResponse GenerateDocument(object rawData, ReportDefinition definition, ReportOutputFormat format, RequestContextData context)
        {
            var model = rawData as IDictionary<string, object?>
                ?? new Dictionary<string, object?>();

            return format switch
            {
                ReportOutputFormat.Html => new ReportResponse
                {
                    Success = true,
                    Format = ReportOutputFormat.Html,
                    Base64Content = Convert.ToBase64String(
                        Encoding.UTF8.GetBytes(_templateEngine.Render(
                            definition.TemplateName ?? throw new InvalidOperationException("TemplateName no configurado."),
                            model,
                            userName: context.UserId.ToString(),
                            title: definition.Title,
                            totalRows: GetIntValue(model, "TotalRows", 0),
                            definition: definition))),
                    FileName = $"{definition.ExportFilePrefix}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.html",
                    ContentType = "text/html",
                    TotalRows = GetIntValue(model, "TotalRows", 1)
                },
                ReportOutputFormat.Pdf => new ReportResponse
                {
                    Success = true,
                    Format = ReportOutputFormat.Pdf,
                    Base64Content = Convert.ToBase64String(_pdfGenerator.Generate(model, definition)),
                    FileName = $"{definition.ExportFilePrefix}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.pdf",
                    ContentType = "application/pdf",
                    TotalRows = GetIntValue(model, "TotalRows", 1)
                },
                ReportOutputFormat.Excel => new ReportResponse
                {
                    Success = true,
                    Format = ReportOutputFormat.Excel,
                    Base64Content = Convert.ToBase64String(_excelGenerator.GenerateDocument(model, definition)),
                    FileName = $"{definition.ExportFilePrefix}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx",
                    ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    TotalRows = GetIntValue(model, "TotalRows", 1)
                },
                _ => throw new ArgumentOutOfRangeException(nameof(format))
            };
        }

        private static int GetIntValue(IDictionary<string, object?> map, string key, int defaultValue)
        {
            if (!map.TryGetValue(key, out var value) || value is null)
            {
                return defaultValue;
            }

            return int.TryParse(value.ToString(), out var parsed) ? parsed : defaultValue;
        }

        private static IDictionary<string, object?> NormalizeBodyReporte(IDictionary<string, object?> body)
        {
            var normalized = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            foreach (var (key, value) in body)
            {
                normalized[key] = NormalizeValue(value);
            }

            if (normalized.TryGetValue("jDevolucion", out var devolucionValue)
                && devolucionValue is IDictionary<string, object?> devolucionMap)
            {
                foreach (var (key, value) in devolucionMap)
                {
                    normalized[key] = value;
                }
            }

            normalized["TotalRows"] = 1;
            return normalized;
        }

        private static object? NormalizeValue(object? value)
        {
            if (value is JsonElement element)
            {
                return element.ValueKind switch
                {
                    JsonValueKind.String => element.GetString(),
                    JsonValueKind.Number when element.TryGetInt64(out var intValue) => intValue,
                    JsonValueKind.Number when element.TryGetDecimal(out var decimalValue) => decimalValue,
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    JsonValueKind.Null => null,
                    JsonValueKind.Object => element.EnumerateObject()
                        .ToDictionary(
                            property => property.Name,
                            property => NormalizeValue(property.Value),
                            StringComparer.OrdinalIgnoreCase),
                    JsonValueKind.Array => element.EnumerateArray()
                        .Select(item => NormalizeValue(item))
                        .ToList(),
                    _ => element.ToString()
                };
            }

            return value;
        }
    }
}