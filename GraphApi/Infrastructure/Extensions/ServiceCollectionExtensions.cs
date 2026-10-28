using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Data;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluentValidation;
using GraphApi.Infrastructure;
using GraphApi.Infrastructure.RequestContext;
using GraphApi.Infrastructure.RateLimiting;
using GraphApi.Infrastructure.Services;
using GraphApi.Models.Reports;
using GraphApi.Models.Security.AuthService;
using GraphApi.Models.SGR.Auth;
using GraphApi.Models.SGR.Validators;
using GraphApi.Models.SGR.Usuarios;
using GraphApi.Models.SGR.Casas;
using GraphApi.Models.ANM.Anuncios;
using GraphApi.Repositories.ANM;
using GraphApi.Services.ANM.Anuncios;
using GraphApi.Services.SGR.Casas;
using GraphApi.Services.SGR.Navegacion;
using GraphApi.Models.SGR.Navegacion;
using GraphApi.Repositories.SGR;
using GraphApi.Infrastructure.Security;
using GraphApi.Services.SGR.Auth;
using GraphApi.Models.FNZ;
using GraphApi.Models.NTF;
using GraphApi.Models.NTF.Validators;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Validators;
using GraphApi.Models.TKT.Tickets;
using GraphApi.Repositories.NTF;
using GraphApi.Repositories.TKT;
using GraphApi.Services.NTF;
using GraphApi.Repositories.Dashboard;
using GraphApi.Repositories.FNZ;
using GraphApi.Models.Dashboard;
using GraphApi.Services.FNZ;
using GraphApi.Services.TKT;
using GraphApi.Services.Reports;
using GraphApi.Services.SGR.Usuarios;
using QuestPDF.Infrastructure;


namespace GraphApi.Infrastructure.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static WebApplicationBuilder AddInfrastructureServices(this WebApplicationBuilder builder)
        {
            var services = builder.Services;
            var config = builder.Configuration;
            var isDevelopment = builder.Environment.IsDevelopment();

            // — CORS: environment-specific allowed origins
            var allowedOrigins = config.GetSection("AllowedOrigins").Get<string[]>() ?? [];
            services.AddCors(options =>
            {
                options.AddPolicy("AllowConfigured", policy =>
                {
                    if (builder.Environment.IsDevelopment())
                    {
                        policy.WithOrigins(
                                "http://localhost:5173",
                                "https://localhost:5173",
                                "http://127.0.0.1:5173")
                            .AllowAnyHeader()
                            .AllowAnyMethod()
                            .AllowCredentials();
                    }
                    else if (allowedOrigins.Length == 0)
                    {
                        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
                    }
                    else
                    {
                        policy.WithOrigins(allowedOrigins)
                              .AllowAnyHeader()
                              .AllowAnyMethod()
                              .AllowCredentials();
                    }
                });
            });

            // — JwtSettings
            var jwtSection = config.GetSection("JwtSettings");
            services.Configure<clJwtSettings>(jwtSection);
            var jwtSettings = jwtSection.Get<clJwtSettings>()!;
            services.AddSingleton(jwtSettings);

            if (string.IsNullOrWhiteSpace(jwtSettings.Key))
            {
                throw new InvalidOperationException("JwtSettings:Key no puede estar vacio. Configura una clave secreta de al menos 32 caracteres.");
            }


            // — Autenticación JWT
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = true;
                options.SaveToken = true;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtSettings.Audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
                    ClockSkew = TimeSpan.Zero,
                    RoleClaimType = "perfil"
                };
            });

            // — Autorización
            services.AddAuthorization(options =>
            {
                options.AddPolicy("AdminOnly",
                    p => p.RequireClaim("role", "Admin"));

                options.AddPolicy("SoloAdministrador",
                    p => p.RequireClaim("perfil", "Administrador"));

                options.AddPolicy("AdminOAsignado", p => p.RequireAssertion(ctx =>
                    ctx.User.HasClaim("perfil", "Administrador")
                    || ctx.User.HasClaim("perfil", "Trabajador")));
            });

            // — Conexiones y contexto de request compartido
            services.AddSingleton<IConnectionFactory, ConnectionFactory>();
            services.AddScoped<IRequestContextAccessor, HttpRequestContextAccessor>();
            services.AddScoped<IDbConnection>(sp =>
                sp.GetRequiredService<IConnectionFactory>().Create("Default"));

            // — Swagger / OpenAPI
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1",
                    new OpenApiInfo { Title = "Fraccionamiento CQ500 GraphAPI", Version = "v1" });

                c.AddSecurityDefinition("Bearer",
                    new OpenApiSecurityScheme
                    {
                        Description = "JWT Authorization header usando Bearer.",
                        Name = "Authorization",
                        In = ParameterLocation.Header,
                        Type = SecuritySchemeType.Http,
                        Scheme = "bearer",
                        BearerFormat = "JWT"
                    });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement {
                    {
                        new OpenApiSecurityScheme {
                            Reference = new OpenApiReference {
                                Type = ReferenceType.SecurityScheme,
                                Id   = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
                c.EnableAnnotations();
            });

            // — HotChocolate GraphQL
            services.AddGraphQLServer()
                .AddAuthorization()
                .AddTypes()
                .AddFiltering()
                .AddSorting()
                .AddProjections()
                .ModifyPagingOptions(o => o.MaxPageSize = 1000)
                .ModifyCostOptions(o =>
                {
                    o.MaxTypeCost  = 10000;
                    o.MaxFieldCost = 10000;
                });
            // Note: Detailed GraphQL exception responses are controlled elsewhere.

            // — ReportEngine
            services.Configure<ReportEngineOptions>(config.GetSection(ReportEngineOptions.SectionName));
            services.AddSingleton<ReportCatalogProvider>();
            QuestPDF.Settings.License = LicenseType.Community;

            // — Controllers REST
            services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                    options.JsonSerializerOptions.PropertyNamingPolicy = null;
                    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
                });

            services.AddMemoryCache();

            // — FluentValidation: validators SGR
            services.AddScoped<IValidator<clCreateUsuarios>, CreateUsuariosValidator>();
            services.AddScoped<IValidator<clUpdateUsuarios>, UpdateUsuariosValidator>();

            // — FluentValidation: validators TKT
            services.AddScoped<IValidator<clCreateTickets>, CreateTicketsValidator>();
            services.AddScoped<IValidator<clUpdateTickets>, UpdateTicketsValidator>();
            services.AddScoped<IValidator<LoginRequest>, LoginRequestValidator>();
            services.AddScoped<IValidator<CambiarPasswordRequest>, CambiarPasswordRequestValidator>();
            services.AddScoped<IValidator<AvisoGeneralRequest>, AvisoGeneralRequestValidator>();
            services.AddScoped<IValidator<CrearTicketInput>, CrearTicketInputValidator>();
            services.AddScoped<IValidator<TicketFiltroDto>, TicketFiltroDtoValidator>();
            services.AddScoped<IValidator<ActualizarPerfilRequest>, ActualizarPerfilRequestValidator>();
            services.AddScoped<IValidator<CrearUsuarioAdminRequest>, CrearUsuarioAdminRequestValidator>();

            services.AddScoped<INotificacionRepository, NotificacionRepository>();
            services.AddScoped<INotificacionService, NotificacionService>();
            services.AddScoped<ITicketCatalogoRepository, TicketCatalogoRepository>();
            services.AddScoped<ICuartaTicketRepository, CuartaTicketRepository>();
            services.AddScoped<ICuartaTicketService, CuartaTicketService>();
            services.AddScoped<ICuartaTicketQueryRepository, CuartaTicketQueryRepository>();
            services.AddScoped<ICuartaTicketQueryService, CuartaTicketQueryService>();
            services.AddScoped<ICuartaTicketAdminRepository, CuartaTicketAdminRepository>();
            services.AddScoped<ICuartaTicketAdminService, CuartaTicketAdminService>();

            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IUsuarioPerfilRepository, UsuarioPerfilRepository>();
            services.AddScoped<IUsuarioPerfilService, UsuarioPerfilService>();
            services.AddSingleton(TimeProvider.System);
            services.AddSingleton<IPasswordGenerator, SecurePasswordGenerator>();
            services.AddScoped<ICuotaEstadoCuentaRepository, CuotaEstadoCuentaRepository>();
            services.AddScoped<ICuotaGeneracionRepository, CuotaGeneracionRepository>();
            services.AddScoped<ICuotaPagoRepository, CuotaPagoRepository>();
            services.AddScoped<IMorososRepository, MorososRepository>();
            services.AddScoped<IValidator<GenerarCuotasRequest>, GenerarCuotasRequestValidator>();
            services.AddScoped<IValidator<RegistrarPagoRequest>, RegistrarPagoRequestValidator>();
            services.AddScoped<IValidator<MorososQuery>, MorososQueryValidator>();
            services.AddScoped<IValidator<ResumenPeriodoQuery>, ResumenPeriodoQueryValidator>();
            services.AddScoped<IDashboardKpiRepository, DashboardKpiRepository>();
            services.AddScoped<IFinanzasService, FinanzasService>();
            services.AddScoped<IUsuarioAdminRepository, UsuarioAdminRepository>();
            services.AddScoped<ICuartaUsuarioAdminService, CuartaUsuarioAdminService>();
            services.AddScoped<ICasasCuartaRepository, CasasCuartaRepository>();
            services.AddScoped<ICuartaCasasService, CuartaCasasService>();
            services.AddScoped<ICuartaNavegacionRepository, CuartaNavegacionRepository>();
            services.AddScoped<ICuartaNavegacionService, CuartaNavegacionService>();
            services.AddScoped<IValidator<MenuCrearRequest>, MenuCrearRequestValidator>();
            services.AddScoped<IValidator<MenuActualizarRequest>, MenuActualizarRequestValidator>();
            services.AddScoped<IValidator<CasaCrearRequest>, CasaCrearRequestValidator>();
            services.AddScoped<IValidator<CasaActualizarRequest>, CasaActualizarRequestValidator>();
            services.AddScoped<ICuartaAnunciosRepository, CuartaAnunciosRepository>();
            services.AddScoped<ICuartaAnunciosService, CuartaAnunciosService>();
            services.AddScoped<IValidator<AnuncioCrearRequest>, AnuncioCrearRequestValidator>();
            services.AddScoped<IValidator<AnuncioActualizarRequest>, AnuncioActualizarRequestValidator>();
            services.AddScoped<GraphApi.Repositories.ENC.ICuartaEncuestasRepository, GraphApi.Repositories.ENC.CuartaEncuestasRepository>();
            services.AddScoped<GraphApi.Services.ENC.Encuestas.ICuartaEncuestasService, GraphApi.Services.ENC.Encuestas.CuartaEncuestasService>();
            services.AddScoped<IValidator<GraphApi.Models.ENC.Encuestas.EncuestaCrearRequest>, GraphApi.Models.ENC.Encuestas.EncuestaCrearRequestValidator>();
            services.AddScoped<IValidator<GraphApi.Models.ENC.Encuestas.EncuestaResponderRequest>, GraphApi.Models.ENC.Encuestas.EncuestaResponderRequestValidator>();
            services.AddScoped<IValidator<GraphApi.Models.ENC.Encuestas.EncuestaActualizarRequest>, GraphApi.Models.ENC.Encuestas.EncuestaActualizarRequestValidator>();
            services.AddScoped<IValidator<GraphApi.Models.ENC.Encuestas.PreguntaCrearRequest>, GraphApi.Models.ENC.Encuestas.PreguntaCrearRequestValidator>();
            services.AddScoped<IValidator<GraphApi.Models.ENC.Encuestas.PreguntaActualizarRequest>, GraphApi.Models.ENC.Encuestas.PreguntaActualizarRequestValidator>();
            services.AddScoped<IValidator<GraphApi.Models.ENC.Encuestas.OpcionActualizarRequest>, GraphApi.Models.ENC.Encuestas.OpcionActualizarRequestValidator>();
            services.AddScoped<GraphApi.Repositories.ARC.ICuartaArchivosRepository, GraphApi.Repositories.ARC.CuartaArchivosRepository>();
            services.AddScoped<GraphApi.Services.ARC.CuartaArchivos.ICuartaArchivosService, GraphApi.Services.ARC.CuartaArchivos.CuartaArchivosService>();
            services.AddSingleton<GraphApi.Infrastructure.Storage.IFileStorage, GraphApi.Infrastructure.Storage.LocalFileStorage>();
            services.AddScoped<GraphApi.Repositories.USR.ICuartaAutomovilesRepository, GraphApi.Repositories.USR.CuartaAutomovilesRepository>();
            services.AddScoped<GraphApi.Services.USR.CuartaAutomoviles.ICuartaAutomovilesService, GraphApi.Services.USR.CuartaAutomoviles.CuartaAutomovilesService>();
            services.AddScoped<GraphApi.Repositories.VTS.ICuartaVisitasRepository, GraphApi.Repositories.VTS.CuartaVisitasRepository>();
            services.AddScoped<GraphApi.Services.VTS.CuartaVisitas.ICuartaVisitasService, GraphApi.Services.VTS.CuartaVisitas.CuartaVisitasService>();
            services.AddScoped<GraphApi.Repositories.JNT.ICuartaJuntasRepository, GraphApi.Repositories.JNT.CuartaJuntasRepository>();
            services.AddScoped<GraphApi.Services.JNT.CuartaJuntas.ICuartaJuntasService, GraphApi.Services.JNT.CuartaJuntas.CuartaJuntasService>();
            services.AddScoped<GraphApi.Repositories.USR.ICuartaMascotasRepository, GraphApi.Repositories.USR.CuartaMascotasRepository>();
            services.AddScoped<GraphApi.Services.USR.CuartaMascotas.ICuartaMascotasService, GraphApi.Services.USR.CuartaMascotas.CuartaMascotasService>();
            services.AddScoped<GraphApi.Repositories.WMS.ICuartaAlmacenRepository, GraphApi.Repositories.WMS.CuartaAlmacenRepository>();
            services.AddScoped<GraphApi.Services.WMS.CuartaAlmacen.ICuartaAlmacenService, GraphApi.Services.WMS.CuartaAlmacen.CuartaAlmacenService>();
            services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
            services.AddScoped<IJwtTokenService, JwtTokenService>();
            services.AddScoped<ICuartaAuthService, CuartaAuthService>();

            // — GraphQL context service (DRY header parsing en resolvers)
            services.AddScoped<IGraphQLContextService, GraphQLContextService>();

            // — Unit of Work (para operaciones multi-tabla TKT/JNT/FNZ)
            services.AddScoped<IUnitOfWork>(sp =>
            {
                var conn = sp.GetRequiredService<IDbConnection>();
                return new UnitOfWork(conn);
            });

            // — Rate Limiting
            var rateLimitingSettings = RateLimitingSettings.FromConfiguration(config, isDevelopment);

            services.AddRateLimiter(options =>
            {
                // Login endpoint: 5 attempts per minute per IP
                options.AddFixedWindowLimiter("login", o =>
                {
                    o.Window = rateLimitingSettings.Window;
                    o.PermitLimit = rateLimitingSettings.LoginPermitLimit;
                    o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    o.QueueLimit = rateLimitingSettings.QueueLimit;
                });

                // In local development the Web app proxies all GraphQL traffic from loopback,
                // so grouping every request only by IP causes false 429s during normal portal use.
                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: rateLimitingSettings.BuildPartitionKey(ctx),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            Window = rateLimitingSettings.Window,
                            PermitLimit = rateLimitingSettings.GlobalPermitLimit,
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = rateLimitingSettings.QueueLimit
                        }));

                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            });

            // — Health Checks
            var defaultConnStr = config.GetConnectionString("Default") ?? string.Empty;
            services.AddHealthChecks()
                .AddSqlServer(defaultConnStr, name: "sqlserver", failureStatus: HealthStatus.Unhealthy);

            // Escanea el ensamblado donde están tus servicios:
            services.Scan(scan => scan
                .FromAssemblyOf<UsuariosService>()       // o typeof(IDefectTypeService).Assembly
                .AddClasses(classes => classes
                    .Where(type => type.Name.EndsWith("Service")
                        && type != typeof(GraphApi.Services.SGR.Auth.CuartaAuthService)))
                .AsImplementedInterfaces()                 // registra IDefectTypeService ← DefectTypeService, IAuthService ← AuthService, etc.
                .WithScopedLifetime()
            );
            services.AddHttpContextAccessor();

            return builder;
        }
    }
}