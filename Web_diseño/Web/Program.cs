using Microsoft.AspNetCore.Authentication.Cookies;
using Web.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IGraphApiBackendService, GraphApiBackendService>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IResidentPortalService, ResidentPortalService>();
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddSingleton<ISiteThemeService, SiteThemeService>();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Login/Login";
        options.AccessDeniedPath = "/Login/Denied";
        options.LogoutPath = "/Login/Logout";
        options.Cookie.Name = "AuthCookie";
        options.ExpireTimeSpan = TimeSpan.FromMinutes(60);
        options.SlidingExpiration = true;
    });


var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

var graphApiSection = builder.Configuration.GetSection("GraphApi");
GraphQLService.Configure(
    endpoint: graphApiSection["Endpoint"] ?? "https://apicuartaquinientos.runasp.net/graphql/",
    user: graphApiSection["ServiceUser"],
    pass: graphApiSection["ServicePassword"],
    refreshSkewSeconds: graphApiSection.GetValue("RefreshSkewSeconds", 90)
);
GraphQLService.ConfigureContext(
    defaultUserId: builder.Configuration["WebDefaults:UserId"] ?? "1",
    defaultWindowName: builder.Configuration["WebDefaults:WindowName"] ?? "web");
GraphQLService.SetHttpContextAccessor(app.Services.GetRequiredService<IHttpContextAccessor>());


app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
