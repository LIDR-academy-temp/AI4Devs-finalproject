using System.Net;
using System.Net.Mail;

namespace Web.Services
{
    /// <summary>
    /// Sends emails via SMTP using the "Email" section in appsettings.
    /// Required config keys:
    ///   Email:Host, Email:Port, Email:UseSsl, Email:User, Email:Password,
    ///   Email:FromAddress, Email:FromName
    /// </summary>
    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendAsync(string toAddress, string toName, string subject, string htmlBody)
        {
            var section = _config.GetSection("Email");
            var host        = section["Host"]        ?? throw new InvalidOperationException("Email:Host not configured.");
            var port        = section.GetValue("Port", 587);
            var useSsl      = section.GetValue("UseSsl", true);
            var user        = section["User"]        ?? string.Empty;
            var password    = section["Password"]    ?? string.Empty;
            var fromAddress = section["FromAddress"] ?? user;
            var fromName    = section["FromName"]    ?? "CuartaQuinientos";

            using var client = new SmtpClient(host, port)
            {
                EnableSsl   = useSsl,
                Credentials = string.IsNullOrWhiteSpace(user)
                    ? null
                    : new NetworkCredential(user, password)
            };

            using var message = new MailMessage
            {
                From       = new MailAddress(fromAddress, fromName),
                Subject    = subject,
                Body       = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(new MailAddress(toAddress, toName));

            try
            {
                await client.SendMailAsync(message);
                _logger.LogInformation("Email enviado a {To} — {Subject}", toAddress, subject);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enviando email a {To}", toAddress);
                throw;
            }
        }
    }
}
