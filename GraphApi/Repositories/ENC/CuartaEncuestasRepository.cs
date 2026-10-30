using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.ENC.Encuestas;

namespace GraphApi.Repositories.ENC;

public sealed class CuartaEncuestasRepository : ICuartaEncuestasRepository
{
    private readonly IDbConnection _db;
    private readonly bool _respuestasTieneEncuestaId;
    private readonly bool _preguntasTieneRequerida;
    private readonly bool _opcionesTieneOrden;

    public CuartaEncuestasRepository(IDbConnection db)
    {
        _db = db;
        _respuestasTieneEncuestaId = SqlSchemaCompat.HasColumn(db, "enc", "Respuestas", "EncuestaID");
        _preguntasTieneRequerida = SqlSchemaCompat.HasColumn(db, "enc", "Preguntas", "Requerida");
        _opcionesTieneOrden = SqlSchemaCompat.HasColumn(db, "enc", "OpcionesPregunta", "Orden");
    }

    private const string VigenteSql = """
        e.bActivo = 1
        AND e.FechaInicio <= SYSUTCDATETIME()
        AND (e.FechaFin IS NULL OR e.FechaFin >= SYSUTCDATETIME())
        """;

    private const string YaParticipoSql = """
        CASE WHEN EXISTS (
            SELECT 1 FROM enc.Respuestas r WITH (NOLOCK)
            WHERE r.EncuestaID = e.EncuestaID AND r.UsuarioID = @UsuarioId AND r.bEliminado = 0
        ) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS YaParticipo
        """;

    public async Task<IReadOnlyList<EncuestaListItemDto>> ListarActivasAsync(int usuarioId, CancellationToken ct = default)
    {
        var sql = $"""
            SELECT e.EncuestaID AS EncuestaId,
                   e.Titulo,
                   e.Descripcion,
                   e.FechaInicio,
                   e.FechaFin,
                   e.bActivo AS Activa,
                   {YaParticipoSql}
            FROM enc.Encuestas e WITH (NOLOCK)
            WHERE e.bEliminado = 0 AND {VigenteSql}
            ORDER BY e.FechaInicio DESC;
            """;
        var list = await _db.QueryAsync<EncuestaListItemDto>(
            new CommandDefinition(sql, new { UsuarioId = usuarioId }, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<IReadOnlyList<EncuestaListItemDto>> ListarAdminAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT e.EncuestaID AS EncuestaId,
                   e.Titulo,
                   e.Descripcion,
                   e.FechaInicio,
                   e.FechaFin,
                   e.bActivo AS Activa,
                   CAST(0 AS bit) AS YaParticipo
            FROM enc.Encuestas e WITH (NOLOCK)
            WHERE e.bEliminado = 0
            ORDER BY e.FechaCreacion DESC;
            """;
        var list = await _db.QueryAsync<EncuestaListItemDto>(new CommandDefinition(sql, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<EncuestaDetalleDto?> ObtenerDetalleAsync(int encuestaId, int usuarioId, CancellationToken ct = default)
    {
        const string headerSql = """
            SELECT e.EncuestaID AS EncuestaId,
                   e.Titulo,
                   e.Descripcion,
                   e.FechaInicio,
                   e.FechaFin,
                   e.bActivo AS Activa,
                   CASE WHEN EXISTS (
                       SELECT 1 FROM enc.Respuestas r WITH (NOLOCK)
                       WHERE r.EncuestaID = e.EncuestaID AND r.UsuarioID = @UsuarioId AND r.bEliminado = 0
                   ) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS YaParticipo
            FROM enc.Encuestas e WITH (NOLOCK)
            WHERE e.EncuestaID = @EncuestaId AND e.bEliminado = 0;
            """;

        var header = await _db.QueryFirstOrDefaultAsync<EncuestaDetalleDto>(
            new CommandDefinition(headerSql, new { EncuestaId = encuestaId, UsuarioId = usuarioId }, cancellationToken: ct));
        if (header is null)
        {
            return null;
        }

        const string preguntasSql = """
            SELECT p.PreguntaID AS PreguntaId,
                   p.Texto,
                   tp.TipoPregunta,
                   p.Orden,
                   p.Requerida
            FROM enc.Preguntas p WITH (NOLOCK)
            INNER JOIN enc.TiposPregunta tp WITH (NOLOCK) ON tp.TipoPreguntaID = p.TipoPreguntaID
            WHERE p.EncuestaID = @EncuestaId AND p.bEliminado = 0
            ORDER BY p.Orden;
            """;

        var preguntas = (await _db.QueryAsync<PreguntaDetalleDto>(
            new CommandDefinition(preguntasSql, new { EncuestaId = encuestaId }, cancellationToken: ct))).ToList();

        const string opcionesConPreguntaSql = """
            SELECT p.PreguntaID AS PreguntaId,
                   o.OpcionPreguntaID AS OpcionPreguntaId,
                   o.Texto,
                   o.Valor,
                   ISNULL(o.Orden, 0) AS Orden
            FROM enc.OpcionesPregunta o WITH (NOLOCK)
            INNER JOIN enc.Preguntas p WITH (NOLOCK) ON p.PreguntaID = o.PreguntaID
            WHERE p.EncuestaID = @EncuestaId AND o.bEliminado = 0 AND p.bEliminado = 0
            ORDER BY p.Orden, o.Orden;
            """;

        var opcionDynamics = await _db.QueryAsync(
            new CommandDefinition(opcionesConPreguntaSql, new { EncuestaId = encuestaId }, cancellationToken: ct));
        var opcionesByPregunta = opcionDynamics
            .GroupBy(r => (int)r.PreguntaId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(r => new OpcionPreguntaDto
                {
                    OpcionPreguntaId = (int)r.OpcionPreguntaId,
                    Texto = (string)r.Texto,
                    Valor = r.Valor as string,
                    Orden = (int)r.Orden,
                }).ToList());

        foreach (var p in preguntas)
        {
            p.Opciones = opcionesByPregunta.TryGetValue(p.PreguntaId, out var ops)
                ? ops
                : Array.Empty<OpcionPreguntaDto>();
        }

        header.Preguntas = preguntas;
        return header;
    }

    public Task<int?> ResolverTipoPreguntaIdAsync(string tipoPregunta, IDbTransaction? tx = null) =>
        ResolverTipoPreguntaIdAsync(tipoPregunta, 0, tx);

    public async Task<int?> ResolverTipoPreguntaIdAsync(string? tipoPregunta, int tipoPreguntaId, IDbTransaction? tx = null)
    {
        if (tipoPreguntaId > 0)
        {
            const string byId = """
                SELECT TipoPreguntaID FROM enc.TiposPregunta WITH (NOLOCK)
                WHERE TipoPreguntaID = @Id AND bEliminado = 0;
                """;
            var id = await _db.ExecuteScalarAsync<int?>(byId, new { Id = tipoPreguntaId }, tx);
            if (id is not null)
            {
                return id;
            }
        }

        if (string.IsNullOrWhiteSpace(tipoPregunta))
        {
            return null;
        }

        const string sql = """
            SELECT TOP 1 TipoPreguntaID FROM enc.TiposPregunta WITH (NOLOCK)
            WHERE TipoPregunta = @Nombre AND bEliminado = 0;
            """;
        var byName = await _db.ExecuteScalarAsync<int?>(sql, new { Nombre = tipoPregunta.Trim() }, tx);
        if (byName is not null)
        {
            return byName;
        }

        const string sqlCi = """
            SELECT TOP 1 TipoPreguntaID FROM enc.TiposPregunta WITH (NOLOCK)
            WHERE LTRIM(RTRIM(TipoPregunta)) COLLATE Latin1_General_CI_AI = @Nombre COLLATE Latin1_General_CI_AI
              AND bEliminado = 0;
            """;
        return await _db.ExecuteScalarAsync<int?>(sqlCi, new { Nombre = tipoPregunta.Trim() }, tx);
    }

    public async Task<int> InsertEncuestaAsync(
        EncuestaCrearRequest request,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        const string insertEnc = """
            INSERT INTO enc.Encuestas
            (Titulo, Descripcion, FechaInicio, FechaFin, bActivo, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES (@Titulo, @Descripcion, @FechaInicio, @FechaFin, 0, @Creado, @UsuarioId, SYSUTCDATETIME(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;

        var encuestaId = await _db.ExecuteScalarAsync<int>(insertEnc, new
        {
            Titulo = request.Titulo.Trim(),
            request.Descripcion,
            request.FechaInicio,
            request.FechaFin,
            Creado = correo,
            UsuarioId = adminId,
        }, tx);

        foreach (var pregunta in request.Preguntas.OrderBy(p => p.Orden))
        {
            var tipoId = await ResolverTipoPreguntaIdAsync(pregunta.TipoPregunta, pregunta.TipoPreguntaId, tx)
                ?? throw new InvalidOperationException("TIPO_PREGUNTA_INVALIDO");

            const string insertPreg = """
                INSERT INTO enc.Preguntas
                (EncuestaID, Texto, TipoPreguntaID, Orden, Requerida, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
                VALUES (@EncuestaId, @Texto, @TipoId, @Orden, @Requerida, @Creado, @UsuarioId, SYSUTCDATETIME(), 0);
                SELECT CAST(SCOPE_IDENTITY() AS int);
                """;

            var preguntaId = await _db.ExecuteScalarAsync<int>(insertPreg, new
            {
                EncuestaId = encuestaId,
                Texto = pregunta.Texto.Trim(),
                TipoId = tipoId,
                pregunta.Orden,
                pregunta.Requerida,
                Creado = correo,
                UsuarioId = adminId,
            }, tx);

            if (pregunta.Opciones is null)
            {
                continue;
            }

            foreach (var op in pregunta.Opciones.OrderBy(o => o.Orden))
            {
                const string insertOp = """
                    INSERT INTO enc.OpcionesPregunta
                    (PreguntaID, Texto, Valor, Orden, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
                    VALUES (@PreguntaId, @Texto, @Valor, @Orden, @Creado, @UsuarioId, SYSUTCDATETIME(), 0);
                    """;
                await _db.ExecuteAsync(insertOp, new
                {
                    PreguntaId = preguntaId,
                    Texto = op.Texto.Trim(),
                    op.Valor,
                    op.Orden,
                    Creado = correo,
                    UsuarioId = adminId,
                }, tx);
            }
        }

        return encuestaId;
    }

    public async Task<bool> PublicarAsync(int encuestaId, string correo, int adminId, IDbTransaction tx)
    {
        const string sql = """
            UPDATE enc.Encuestas
            SET bActivo = 1,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE EncuestaID = @Id AND bEliminado = 0 AND bActivo = 0;
            """;
        var n = await _db.ExecuteAsync(sql, new { Id = encuestaId, Correo = correo, AdminId = adminId }, tx);
        return n > 0;
    }

    public async Task<(bool Abierta, bool Existe)> EstadoEncuestaAsync(int encuestaId, IDbTransaction? tx = null)
    {
        const string sql = """
            SELECT
                CASE WHEN bEliminado = 0 THEN 1 ELSE 0 END AS Existe,
                CASE WHEN bEliminado = 0 AND bActivo = 1
                     AND FechaInicio <= SYSUTCDATETIME()
                     AND (FechaFin IS NULL OR FechaFin >= SYSUTCDATETIME())
                THEN 1 ELSE 0 END AS Abierta
            FROM enc.Encuestas WITH (NOLOCK)
            WHERE EncuestaID = @Id;
            """;
        var row = await _db.QueryFirstOrDefaultAsync<(int Existe, int Abierta)>(sql, new { Id = encuestaId }, tx);
        if (row.Existe == 0)
        {
            return (false, false);
        }

        return (row.Abierta == 1, true);
    }

    public async Task<bool> EncuestaEstaPublicadaAsync(int encuestaId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT CASE WHEN bEliminado = 0 AND bActivo = 1 THEN 1 ELSE 0 END
            FROM enc.Encuestas WITH (NOLOCK)
            WHERE EncuestaID = @Id;
            """;
        var publicada = await _db.ExecuteScalarAsync<int?>(
            new CommandDefinition(sql, new { Id = encuestaId }, cancellationToken: ct));
        return publicada == 1;
    }

    public async Task<bool> UsuarioYaParticipoAsync(int encuestaId, int usuarioId, IDbTransaction? tx = null)
    {
        var sql = _respuestasTieneEncuestaId
            ? """
              SELECT CASE WHEN EXISTS (
                  SELECT 1 FROM enc.Respuestas WITH (NOLOCK)
                  WHERE EncuestaID = @EncuestaId AND UsuarioID = @UsuarioId AND bEliminado = 0
              ) THEN 1 ELSE 0 END;
              """
            : """
              SELECT CASE WHEN EXISTS (
                  SELECT 1
                  FROM enc.Respuestas r WITH (NOLOCK)
                  INNER JOIN enc.Preguntas p WITH (NOLOCK) ON p.PreguntaID = r.PreguntaID
                  WHERE p.EncuestaID = @EncuestaId AND r.UsuarioID = @UsuarioId
                    AND r.bEliminado = 0 AND p.bEliminado = 0
              ) THEN 1 ELSE 0 END;
              """;
        return SqlSchemaCompat.ScalarToInt32(
            await _db.ExecuteScalarAsync(sql, new { EncuestaId = encuestaId, UsuarioId = usuarioId }, tx)) == 1;
    }

    public async Task InsertRespuestasAsync(
        int encuestaId,
        int usuarioId,
        string correo,
        IReadOnlyList<RespuestaItemRequest> respuestas,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO enc.Respuestas
            (EncuestaID, PreguntaID, UsuarioID, OpcionPreguntaID, RespuestaTexto, FechaRespuesta,
             Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES (@EncuestaId, @PreguntaId, @UsuarioId, @OpcionId, @Texto, SYSUTCDATETIME(),
                    @Creado, @UsuarioId, SYSUTCDATETIME(), 0);
            """;
        foreach (var r in respuestas)
        {
            await _db.ExecuteAsync(sql, new
            {
                EncuestaId = encuestaId,
                PreguntaId = r.PreguntaId,
                UsuarioId = usuarioId,
                OpcionId = r.OpcionPreguntaId,
                Texto = r.RespuestaTexto,
                Creado = correo,
            }, tx);
        }
    }

    public async Task<IReadOnlyList<PreguntaMetaRow>> ObtenerPreguntasMetaAsync(int encuestaId, IDbTransaction? tx = null)
    {
        var requeridaExpr = _preguntasTieneRequerida ? "p.Requerida" : "CAST(1 AS bit)";
        var sql = $"""
            SELECT p.PreguntaID AS PreguntaId, tp.TipoPregunta, {requeridaExpr} AS Requerida
            FROM enc.Preguntas p WITH (NOLOCK)
            INNER JOIN enc.TiposPregunta tp WITH (NOLOCK) ON tp.TipoPreguntaID = p.TipoPreguntaID
            WHERE p.EncuestaID = @EncuestaId AND p.bEliminado = 0;
            """;
        var list = await _db.QueryAsync<PreguntaMetaRow>(sql, new { EncuestaId = encuestaId }, tx);
        return list.ToList();
    }

    public async Task<EncuestaResultadosDto?> ObtenerResultadosAsync(int encuestaId, CancellationToken ct = default)
    {
        const string headerSql = """
            SELECT EncuestaID AS EncuestaId, Titulo
            FROM enc.Encuestas WITH (NOLOCK)
            WHERE EncuestaID = @Id AND bEliminado = 0;
            """;
        var header = await _db.QueryFirstOrDefaultAsync<EncuestaResultadosDto>(
            new CommandDefinition(headerSql, new { Id = encuestaId }, cancellationToken: ct));
        if (header is null)
        {
            return null;
        }

        var participantesSql = _respuestasTieneEncuestaId
            ? """
              SELECT COUNT(DISTINCT UsuarioID)
              FROM enc.Respuestas WITH (NOLOCK)
              WHERE EncuestaID = @Id AND bEliminado = 0;
              """
            : """
              SELECT COUNT(DISTINCT r.UsuarioID)
              FROM enc.Respuestas r WITH (NOLOCK)
              INNER JOIN enc.Preguntas p WITH (NOLOCK) ON p.PreguntaID = r.PreguntaID
              WHERE p.EncuestaID = @Id AND r.bEliminado = 0 AND p.bEliminado = 0;
              """;
        var participantesRaw = await _db.ExecuteScalarAsync(
            new CommandDefinition(participantesSql, new { Id = encuestaId }, cancellationToken: ct));
        header.TotalParticipantes = SqlSchemaCompat.ScalarToInt32(participantesRaw);

        var preguntas = (await ObtenerPreguntasMetaAsync(encuestaId)).ToList();
        var resultadoPreguntas = new List<ResultadoPreguntaDto>();

        foreach (var p in preguntas)
        {
            var detalle = new ResultadoPreguntaDto
            {
                PreguntaId = p.PreguntaId,
                TipoPregunta = p.TipoPregunta,
            };

            const string textoPreguntaSql = "SELECT Texto FROM enc.Preguntas WHERE PreguntaID = @Id;";
            detalle.Texto = await _db.ExecuteScalarAsync<string>(textoPreguntaSql, new { Id = p.PreguntaId }) ?? "";

            if (p.TipoPregunta.Contains("texto", StringComparison.OrdinalIgnoreCase))
            {
                const string textosSql = """
                    SELECT RespuestaTexto FROM enc.Respuestas WITH (NOLOCK)
                    WHERE PreguntaID = @PreguntaId AND bEliminado = 0 AND RespuestaTexto IS NOT NULL;
                    """;
                var textos = await _db.QueryAsync<string>(
                    new CommandDefinition(textosSql, new { PreguntaId = p.PreguntaId }, cancellationToken: ct));
                detalle.RespuestasTexto = textos.ToList();
            }
            else
            {
                var groupBy = _opcionesTieneOrden
                    ? "o.OpcionPreguntaID, o.Texto, o.Orden"
                    : "o.OpcionPreguntaID, o.Texto";
                var orderBy = _opcionesTieneOrden ? "o.Orden" : "o.OpcionPreguntaID";
                var aggSql = $"""
                    SELECT o.OpcionPreguntaID AS OpcionPreguntaId,
                           o.Texto,
                           COUNT(r.RespuestaID) AS Conteo
                    FROM enc.OpcionesPregunta o WITH (NOLOCK)
                    LEFT JOIN enc.Respuestas r WITH (NOLOCK)
                        ON r.OpcionPreguntaID = o.OpcionPreguntaID AND r.bEliminado = 0
                    WHERE o.PreguntaID = @PreguntaId AND o.bEliminado = 0
                    GROUP BY {groupBy}
                    ORDER BY {orderBy};
                    """;
                var rows = await _db.QueryAsync<ResultadoOpcionAggRow>(
                    new CommandDefinition(aggSql, new { PreguntaId = p.PreguntaId }, cancellationToken: ct));
                var opciones = rows.Select(r => new
                {
                    Id = r.OpcionPreguntaId,
                    Texto = r.Texto ?? string.Empty,
                    Conteo = SqlSchemaCompat.ScalarToInt32(r.Conteo),
                }).ToList();
                var total = opciones.Sum(x => x.Conteo);
                detalle.Opciones = opciones.Select(r => new ResultadoOpcionDto
                {
                    OpcionPreguntaId = r.Id,
                    Texto = r.Texto,
                    Conteo = r.Conteo,
                    Porcentaje = total == 0 ? 0 : Math.Round(100m * r.Conteo / total, 2),
                }).ToList();
            }

            resultadoPreguntas.Add(detalle);
        }

        header.Preguntas = resultadoPreguntas;
        return header;
    }

    public async Task<bool> OpcionPerteneceAPreguntaAsync(
        int encuestaId,
        int preguntaId,
        int opcionPreguntaId,
        IDbTransaction? tx = null)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM enc.OpcionesPregunta o WITH (NOLOCK)
                INNER JOIN enc.Preguntas p WITH (NOLOCK) ON p.PreguntaID = o.PreguntaID
                WHERE p.EncuestaID = @EncuestaId
                  AND p.PreguntaID = @PreguntaId
                  AND o.OpcionPreguntaID = @OpcionId
                  AND p.bEliminado = 0 AND o.bEliminado = 0
            ) THEN 1 ELSE 0 END;
            """;
        return await _db.ExecuteScalarAsync<int>(
            sql,
            new { EncuestaId = encuestaId, PreguntaId = preguntaId, OpcionId = opcionPreguntaId },
            tx) == 1;
    }

    public async Task<IReadOnlyList<TipoPreguntaItemDto>> ListarTiposPreguntaAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT TipoPreguntaID AS TipoPreguntaId, TipoPregunta
            FROM enc.TiposPregunta WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY TipoPregunta;
            """;
        var list = await _db.QueryAsync<TipoPreguntaItemDto>(new CommandDefinition(sql, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<bool> EsBorradorEditableAsync(int encuestaId, IDbTransaction? tx = null)
    {
        const string sql = """
            SELECT CASE WHEN bEliminado = 0 AND bActivo = 0 THEN 1 ELSE 0 END
            FROM enc.Encuestas WITH (NOLOCK)
            WHERE EncuestaID = @Id;
            """;
        return await _db.ExecuteScalarAsync<int>(sql, new { Id = encuestaId }, tx) == 1;
    }

    public async Task<int> ContarPreguntasAsync(int encuestaId, IDbTransaction? tx = null)
    {
        const string sql = """
            SELECT COUNT(*) FROM enc.Preguntas WITH (NOLOCK)
            WHERE EncuestaID = @EncuestaId AND bEliminado = 0;
            """;
        return await _db.ExecuteScalarAsync<int>(sql, new { EncuestaId = encuestaId }, tx);
    }

    public async Task<bool> ActualizarEncuestaAsync(
        int encuestaId,
        EncuestaActualizarRequest request,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE enc.Encuestas
            SET Titulo = @Titulo,
                Descripcion = @Descripcion,
                FechaInicio = @FechaInicio,
                FechaFin = @FechaFin,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE EncuestaID = @Id AND bEliminado = 0 AND bActivo = 0;
            """;
        var n = await _db.ExecuteAsync(sql, new
        {
            Id = encuestaId,
            Titulo = request.Titulo.Trim(),
            request.Descripcion,
            request.FechaInicio,
            request.FechaFin,
            Correo = correo,
            AdminId = adminId,
        }, tx);
        return n > 0;
    }

    public async Task<bool> EliminarEncuestaAsync(int encuestaId, string correo, int adminId, IDbTransaction tx)
    {
        const string sql = """
            UPDATE enc.Encuestas
            SET bEliminado = 1,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE EncuestaID = @Id AND bEliminado = 0 AND bActivo = 0;
            """;
        var n = await _db.ExecuteAsync(sql, new { Id = encuestaId, Correo = correo, AdminId = adminId }, tx);
        return n > 0;
    }

    public async Task<int?> ObtenerEncuestaIdPorPreguntaAsync(int preguntaId, IDbTransaction? tx = null)
    {
        const string sql = """
            SELECT EncuestaID FROM enc.Preguntas WITH (NOLOCK)
            WHERE PreguntaID = @Id AND bEliminado = 0;
            """;
        return await _db.ExecuteScalarAsync<int?>(sql, new { Id = preguntaId }, tx);
    }

    public async Task<int?> ObtenerPreguntaIdPorOpcionAsync(int opcionPreguntaId, IDbTransaction? tx = null)
    {
        const string sql = """
            SELECT PreguntaID FROM enc.OpcionesPregunta WITH (NOLOCK)
            WHERE OpcionPreguntaID = @Id AND bEliminado = 0;
            """;
        return await _db.ExecuteScalarAsync<int?>(sql, new { Id = opcionPreguntaId }, tx);
    }

    public async Task<int> InsertPreguntaAsync(
        int encuestaId,
        PreguntaCrearRequest request,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        var tipoId = await ResolverTipoPreguntaIdAsync(request.TipoPregunta, request.TipoPreguntaId, tx)
            ?? throw new InvalidOperationException("TIPO_PREGUNTA_INVALIDO");

        var orden = request.Orden;
        if (orden <= 0)
        {
            const string maxOrdenSql = """
                SELECT ISNULL(MAX(Orden), 0) + 1 FROM enc.Preguntas WITH (NOLOCK)
                WHERE EncuestaID = @EncuestaId AND bEliminado = 0;
                """;
            orden = await _db.ExecuteScalarAsync<int>(maxOrdenSql, new { EncuestaId = encuestaId }, tx);
        }

        const string insertPreg = """
            INSERT INTO enc.Preguntas
            (EncuestaID, Texto, TipoPreguntaID, Orden, Requerida, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES (@EncuestaId, @Texto, @TipoId, @Orden, @Requerida, @Creado, @UsuarioId, SYSUTCDATETIME(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;

        var preguntaId = await _db.ExecuteScalarAsync<int>(insertPreg, new
        {
            EncuestaId = encuestaId,
            Texto = request.Texto.Trim(),
            TipoId = tipoId,
            Orden = orden,
            request.Requerida,
            Creado = correo,
            UsuarioId = adminId,
        }, tx);

        if (request.Opciones is not null)
        {
            foreach (var op in request.Opciones.OrderBy(o => o.Orden))
            {
                const string insertOp = """
                    INSERT INTO enc.OpcionesPregunta
                    (PreguntaID, Texto, Valor, Orden, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
                    VALUES (@PreguntaId, @Texto, @Valor, @Orden, @Creado, @UsuarioId, SYSUTCDATETIME(), 0);
                    """;
                await _db.ExecuteAsync(insertOp, new
                {
                    PreguntaId = preguntaId,
                    Texto = op.Texto.Trim(),
                    op.Valor,
                    op.Orden,
                    Creado = correo,
                    UsuarioId = adminId,
                }, tx);
            }
        }

        return preguntaId;
    }

    public async Task<bool> ActualizarPreguntaAsync(
        int preguntaId,
        PreguntaActualizarRequest request,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        var tipoId = await ResolverTipoPreguntaIdAsync(request.TipoPregunta, request.TipoPreguntaId, tx)
            ?? throw new InvalidOperationException("TIPO_PREGUNTA_INVALIDO");

        const string sql = """
            UPDATE p
            SET p.Texto = @Texto,
                p.TipoPreguntaID = @TipoId,
                p.Orden = @Orden,
                p.Requerida = @Requerida,
                p.Modificado = @Correo,
                p.UsuarioModificacionID = @AdminId,
                p.FechaModificacion = SYSUTCDATETIME()
            FROM enc.Preguntas p
            INNER JOIN enc.Encuestas e ON e.EncuestaID = p.EncuestaID
            WHERE p.PreguntaID = @Id AND p.bEliminado = 0 AND e.bEliminado = 0 AND e.bActivo = 0;
            """;
        var n = await _db.ExecuteAsync(sql, new
        {
            Id = preguntaId,
            Texto = request.Texto.Trim(),
            TipoId = tipoId,
            request.Orden,
            request.Requerida,
            Correo = correo,
            AdminId = adminId,
        }, tx);
        return n > 0;
    }

    public async Task<bool> EliminarPreguntaAsync(int preguntaId, string correo, int adminId, IDbTransaction tx)
    {
        const string sql = """
            UPDATE p
            SET p.bEliminado = 1,
                p.Modificado = @Correo,
                p.UsuarioModificacionID = @AdminId,
                p.FechaModificacion = SYSUTCDATETIME()
            FROM enc.Preguntas p
            INNER JOIN enc.Encuestas e ON e.EncuestaID = p.EncuestaID
            WHERE p.PreguntaID = @Id AND p.bEliminado = 0 AND e.bEliminado = 0 AND e.bActivo = 0;
            """;
        var n = await _db.ExecuteAsync(sql, new { Id = preguntaId, Correo = correo, AdminId = adminId }, tx);
        return n > 0;
    }

    public async Task<int> InsertOpcionAsync(
        int preguntaId,
        OpcionCrearRequest request,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        var orden = request.Orden;
        if (orden <= 0)
        {
            const string maxOrdenSql = """
                SELECT ISNULL(MAX(Orden), 0) + 1 FROM enc.OpcionesPregunta WITH (NOLOCK)
                WHERE PreguntaID = @PreguntaId AND bEliminado = 0;
                """;
            orden = await _db.ExecuteScalarAsync<int>(maxOrdenSql, new { PreguntaId = preguntaId }, tx);
        }

        const string insertOp = """
            INSERT INTO enc.OpcionesPregunta
            (PreguntaID, Texto, Valor, Orden, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.OpcionPreguntaID
            SELECT @PreguntaId, @Texto, @Valor, @Orden, @Creado, @UsuarioId, SYSUTCDATETIME(), 0
            FROM enc.Preguntas p
            INNER JOIN enc.Encuestas e ON e.EncuestaID = p.EncuestaID
            WHERE p.PreguntaID = @PreguntaId AND p.bEliminado = 0 AND e.bEliminado = 0 AND e.bActivo = 0;
            """;
        var id = await _db.ExecuteScalarAsync<int?>(insertOp, new
        {
            PreguntaId = preguntaId,
            Texto = request.Texto.Trim(),
            request.Valor,
            Orden = orden,
            Creado = correo,
            UsuarioId = adminId,
        }, tx);
        return id ?? throw new InvalidOperationException("PREGUNTA_NO_EDITABLE");
    }

    public async Task<bool> ActualizarOpcionAsync(
        int opcionPreguntaId,
        OpcionActualizarRequest request,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE o
            SET o.Texto = @Texto,
                o.Valor = @Valor,
                o.Orden = @Orden,
                o.Modificado = @Correo,
                o.UsuarioModificacionID = @AdminId,
                o.FechaModificacion = SYSUTCDATETIME()
            FROM enc.OpcionesPregunta o
            INNER JOIN enc.Preguntas p ON p.PreguntaID = o.PreguntaID
            INNER JOIN enc.Encuestas e ON e.EncuestaID = p.EncuestaID
            WHERE o.OpcionPreguntaID = @Id AND o.bEliminado = 0 AND p.bEliminado = 0
              AND e.bEliminado = 0 AND e.bActivo = 0;
            """;
        var n = await _db.ExecuteAsync(sql, new
        {
            Id = opcionPreguntaId,
            Texto = request.Texto.Trim(),
            request.Valor,
            request.Orden,
            Correo = correo,
            AdminId = adminId,
        }, tx);
        return n > 0;
    }

    public async Task<bool> EliminarOpcionAsync(int opcionPreguntaId, string correo, int adminId, IDbTransaction tx)
    {
        const string sql = """
            UPDATE o
            SET o.bEliminado = 1,
                o.Modificado = @Correo,
                o.UsuarioModificacionID = @AdminId,
                o.FechaModificacion = SYSUTCDATETIME()
            FROM enc.OpcionesPregunta o
            INNER JOIN enc.Preguntas p ON p.PreguntaID = o.PreguntaID
            INNER JOIN enc.Encuestas e ON e.EncuestaID = p.EncuestaID
            WHERE o.OpcionPreguntaID = @Id AND o.bEliminado = 0 AND p.bEliminado = 0
              AND e.bEliminado = 0 AND e.bActivo = 0;
            """;
        var n = await _db.ExecuteAsync(sql, new { Id = opcionPreguntaId, Correo = correo, AdminId = adminId }, tx);
        return n > 0;
    }

    private sealed class ResultadoOpcionAggRow
    {
        public int OpcionPreguntaId { get; init; }
        public string? Texto { get; init; }
        public long Conteo { get; init; }
    }
}
