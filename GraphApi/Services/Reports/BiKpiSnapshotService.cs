using ClosedXML.Excel;
using GraphApi.Models.Reports;
using GraphApi.Repositories.Reports;
using Microsoft.Data.SqlClient;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace GraphApi.Services.Reports;

public sealed class BiKpiSnapshotService : IBiKpiSnapshotService
{
    private readonly IBiKpiSnapshotRepository _repo;

    public BiKpiSnapshotService(IBiKpiSnapshotRepository repo) => _repo = repo;

    public async Task EnsureDailySnapshotsAsync(CancellationToken ct = default)
    {
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        var condominios = await _repo.ListCondominioIdsAsync(ct);
        foreach (var id in condominios)
        {
            try
            {
                await EnsureSnapshotAsync(id, hoy, ct);
            }
            catch (Exception)
            {
                // continuar con otros condominios
            }
        }
    }

    public async Task EnsureSnapshotAsync(int condominioId, DateOnly fecha, CancellationToken ct = default)
    {
        if (await _repo.ExistsAsync(condominioId, fecha, ct))
        {
            return;
        }

        var row = await _repo.CalculateAsync(condominioId, fecha, ct);
        try
        {
            await _repo.InsertAsync(condominioId, fecha, row, ct);
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        {
            // carrera worker + lectura: índice único ya insertó la fila
        }
    }

    public async Task<IReadOnlyList<BiKpiSnapshotDto>> GetTendenciasAsync(
        int condominioId,
        int meses,
        CancellationToken ct = default)
    {
        meses = Math.Clamp(meses, 1, 24);
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        var fechas = new HashSet<DateOnly> { hoy };
        for (var i = 1; i <= meses; i++)
        {
            var anchor = hoy.AddMonths(-i);
            var day = Math.Min(hoy.Day, DateTime.DaysInMonth(anchor.Year, anchor.Month));
            fechas.Add(new DateOnly(anchor.Year, anchor.Month, day));
        }

        foreach (var fecha in fechas.OrderBy(f => f))
        {
            await EnsureSnapshotAsync(condominioId, fecha, ct);
        }

        return await _repo.ListTendenciasAsync(condominioId, meses, ct);
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> ExportBiPdfAsync(
        int condominioId,
        int meses,
        CancellationToken ct = default)
    {
        var data = await GetTendenciasAsync(condominioId, meses, ct);
        var bytes = Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Margin(30);
                page.Header().Text("Reporte BI — tendencias").FontSize(16).SemiBold();
                page.Content().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn();
                        c.RelativeColumn();
                        c.RelativeColumn();
                        c.RelativeColumn();
                    });
                    table.Header(h =>
                    {
                        h.Cell().Text("Fecha");
                        h.Cell().Text("Tickets ab.");
                        h.Cell().Text("Ingresos");
                        h.Cell().Text("Morosos");
                    });
                    foreach (var row in data)
                    {
                        table.Cell().Text(row.Fecha.ToString("yyyy-MM-dd"));
                        table.Cell().Text(row.TicketsAbiertos.ToString());
                        table.Cell().Text(row.IngresosMXN.ToString("N2"));
                        table.Cell().Text(row.ResidentesMorosos.ToString());
                    }
                });
            });
        }).GeneratePdf();
        return (bytes, "application/pdf", $"bi-tendencias-{meses}m.pdf");
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> ExportBiExcelAsync(
        int condominioId,
        int meses,
        CancellationToken ct = default)
    {
        var data = await GetTendenciasAsync(condominioId, meses, ct);
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("BI");
        ws.Cell(1, 1).Value = "Fecha";
        ws.Cell(1, 2).Value = "TicketsAbiertos";
        ws.Cell(1, 3).Value = "TicketsCerrados";
        ws.Cell(1, 4).Value = "TiempoMedioResolucionHoras";
        ws.Cell(1, 5).Value = "IngresosMXN";
        ws.Cell(1, 6).Value = "EgresosMXN";
        ws.Cell(1, 7).Value = "ResidentesMorosos";
        ws.Cell(1, 8).Value = "CasasTotales";
        ws.Cell(1, 9).Value = "CasasOcupadas";
        var r = 2;
        foreach (var row in data)
        {
            ws.Cell(r, 1).Value = row.Fecha.ToString("yyyy-MM-dd");
            ws.Cell(r, 2).Value = row.TicketsAbiertos;
            ws.Cell(r, 3).Value = row.TicketsCerrados;
            ws.Cell(r, 4).Value = row.TiempoMedioResolucionHoras;
            ws.Cell(r, 5).Value = row.IngresosMXN;
            ws.Cell(r, 6).Value = row.EgresosMXN;
            ws.Cell(r, 7).Value = row.ResidentesMorosos;
            ws.Cell(r, 8).Value = row.CasasTotales;
            ws.Cell(r, 9).Value = row.CasasOcupadas;
            r++;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"bi-tendencias-{meses}m.xlsx");
    }

    public Task<(byte[] Content, string ContentType, string FileName)> ExportFinanzasMesAsync(
        int condominioId,
        int mes,
        int anio,
        string formato,
        CancellationToken ct = default)
        => ExportFinanzasMesInternalAsync(condominioId, mes, anio, formato, ct);

    public Task<(byte[] Content, string ContentType, string FileName)> ExportTicketsPeriodoAsync(
        int condominioId,
        int mes,
        int anio,
        string formato,
        CancellationToken ct = default)
        => ExportTicketsPeriodoInternalAsync(condominioId, mes, anio, formato, ct);

    private static (DateTime Inicio, DateTime Fin) MesBounds(int mes, int anio)
    {
        var inicio = new DateTime(anio, mes, 1, 0, 0, 0, DateTimeKind.Utc);
        return (inicio, inicio.AddMonths(1));
    }

    private async Task<(byte[] Content, string ContentType, string FileName)> ExportFinanzasMesInternalAsync(
        int condominioId,
        int mes,
        int anio,
        string formato,
        CancellationToken ct)
    {
        var (inicio, fin) = MesBounds(mes, anio);
        var cuotas = await _repo.ListCuotasPagadasMesAsync(condominioId, inicio, fin, ct);
        var movs = await _repo.ListTransaccionesMesAsync(condominioId, inicio, fin, ct);
        var title = $"Finanzas {mes:00}/{anio}";

        if (string.Equals(formato, "xlsx", StringComparison.OrdinalIgnoreCase))
        {
            using var wb = new XLWorkbook();
            var wsC = wb.AddWorksheet("Cuotas pagadas");
            wsC.Cell(1, 1).Value = "CuotaID";
            wsC.Cell(1, 2).Value = "Residente";
            wsC.Cell(1, 3).Value = "Monto";
            wsC.Cell(1, 4).Value = "FechaPago";
            var r = 2;
            foreach (var c in cuotas)
            {
                wsC.Cell(r, 1).Value = c.CuotaID;
                wsC.Cell(r, 2).Value = c.NombreUsuario;
                wsC.Cell(r, 3).Value = c.Monto;
                wsC.Cell(r, 4).Value = c.FechaPago?.ToString("yyyy-MM-dd") ?? "";
                r++;
            }

            var wsT = wb.AddWorksheet("Transacciones");
            wsT.Cell(1, 1).Value = "ID";
            wsT.Cell(1, 2).Value = "Cuenta";
            wsT.Cell(1, 3).Value = "Usuario";
            wsT.Cell(1, 4).Value = "Tipo";
            wsT.Cell(1, 5).Value = "Cargo";
            wsT.Cell(1, 6).Value = "Abono";
            wsT.Cell(1, 7).Value = "Fecha";
            r = 2;
            foreach (var t in movs)
            {
                wsT.Cell(r, 1).Value = t.TransaccionID;
                wsT.Cell(r, 2).Value = t.Cuenta;
                wsT.Cell(r, 3).Value = t.NombreUsuario;
                wsT.Cell(r, 4).Value = t.TipoMovimiento;
                wsT.Cell(r, 5).Value = t.Cargo ?? 0;
                wsT.Cell(r, 6).Value = t.Abono ?? 0;
                wsT.Cell(r, 7).Value = t.FechaCreacion.ToString("yyyy-MM-dd");
                r++;
            }

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "finanzas-mes.xlsx");
        }

        var pdf = Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Margin(30);
                page.Header().Text(title).FontSize(14).SemiBold();
                page.Content().Column(col =>
                {
                    col.Item().Text($"Cuotas pagadas: {cuotas.Count}").SemiBold();
                    foreach (var c in cuotas.Take(40))
                    {
                        col.Item().Text($"{c.NombreUsuario} — {c.Monto:N2} — {c.FechaPago:yyyy-MM-dd}");
                    }

                    col.Item().PaddingTop(10).Text($"Transacciones: {movs.Count}").SemiBold();
                    foreach (var t in movs.Take(40))
                    {
                        col.Item().Text($"{t.FechaCreacion:yyyy-MM-dd} {t.TipoMovimiento} C:{t.Cargo:N2} A:{t.Abono:N2}");
                    }
                });
            });
        }).GeneratePdf();
        return (pdf, "application/pdf", "finanzas-mes.pdf");
    }

    private async Task<(byte[] Content, string ContentType, string FileName)> ExportTicketsPeriodoInternalAsync(
        int condominioId,
        int mes,
        int anio,
        string formato,
        CancellationToken ct)
    {
        var (inicio, fin) = MesBounds(mes, anio);
        var tickets = await _repo.ListTicketsPeriodoAsync(condominioId, inicio, fin, ct);
        var title = $"Tickets {mes:00}/{anio}";

        if (string.Equals(formato, "xlsx", StringComparison.OrdinalIgnoreCase))
        {
            using var wb = new XLWorkbook();
            var ws = wb.AddWorksheet("Tickets");
            ws.Cell(1, 1).Value = "ID";
            ws.Cell(1, 2).Value = "Titulo";
            ws.Cell(1, 3).Value = "Solicitante";
            ws.Cell(1, 4).Value = "Prioridad";
            ws.Cell(1, 5).Value = "Estado";
            ws.Cell(1, 6).Value = "Creado";
            ws.Cell(1, 7).Value = "Cierre";
            var r = 2;
            foreach (var t in tickets)
            {
                ws.Cell(r, 1).Value = t.TicketID;
                ws.Cell(r, 2).Value = t.TituloTicket;
                ws.Cell(r, 3).Value = t.NombreSolicitante;
                ws.Cell(r, 4).Value = t.PrioridadTicket;
                ws.Cell(r, 5).Value = t.EstadoTicket;
                ws.Cell(r, 6).Value = t.FechaCreacionTicket.ToString("yyyy-MM-dd");
                ws.Cell(r, 7).Value = t.FechaCierre?.ToString("yyyy-MM-dd") ?? "";
                r++;
            }

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "tickets-periodo.xlsx");
        }

        var pdf = Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Margin(30);
                page.Header().Text(title).FontSize(14).SemiBold();
                page.Content().Column(col =>
                {
                    foreach (var t in tickets.Take(50))
                    {
                        col.Item().Text($"#{t.TicketID} {t.TituloTicket} — {t.EstadoTicket} ({t.FechaCreacionTicket:yyyy-MM-dd})");
                    }
                });
            });
        }).GeneratePdf();
        return (pdf, "application/pdf", "tickets-periodo.pdf");
    }
}
