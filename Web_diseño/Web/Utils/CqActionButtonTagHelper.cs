using Microsoft.AspNetCore.Razor.TagHelpers;

namespace Web.Utils;

/// <summary>
/// Tag helper que convierte <a cq-btn="edit"> y <button cq-btn="delete">
/// en botones icono CQ con la clase y el ícono MDI correspondiente.
///
/// Tipos soportados:
///   edit     → cq-edit   + mdi-pencil
///   delete   → cq-delete + mdi-delete
///   view     → cq-view   + mdi-eye
///   reserve  → cq-reserve + mdi-calendar-plus
///   list     → cq-list   + mdi-calendar-text
///   file     → cq-file   + mdi-file-document
///   share    → cq-share  + mdi-share-variant
///
/// Uso en vistas:
///   <a cq-btn="edit" asp-controller="X" asp-action="Y" asp-route-id="@item.ID" title="Editar"></a>
///   <button cq-btn="delete" type="submit" onclick="return confirm('¿Eliminar?')" title="Eliminar"></button>
/// </summary>
[HtmlTargetElement("a", Attributes = "cq-btn")]
[HtmlTargetElement("button", Attributes = "cq-btn")]
public class CqActionButtonTagHelper : TagHelper
{
    [HtmlAttributeName("cq-btn")]
    public string BtnType { get; set; } = string.Empty;

    /// <summary>
    /// Icono MDI opcional que sobreescribe el predeterminado del tipo.
    /// Ejemplo: cq-icon="lock-open"
    /// </summary>
    [HtmlAttributeName("cq-icon")]
    public string? IconOverride { get; set; }

    // Ejecutar DESPUÉS de AnchorTagHelper (order 0) para no pisar el href generado
    public override int Order => 1000;

    private static readonly Dictionary<string, string> IconMap = new(StringComparer.OrdinalIgnoreCase)
    {
        { "edit",    "pencil" },
        { "delete",  "delete" },
        { "view",    "eye" },
        { "reserve", "calendar-plus" },
        { "list",    "calendar-text" },
        { "file",    "file-document" },
        { "share",   "share-variant" },
        { "chart",   "chart-bar" },
    };

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        string icon = !string.IsNullOrWhiteSpace(IconOverride)
            ? IconOverride
            : (IconMap.TryGetValue(BtnType, out var ic) ? ic : BtnType);

        // Quitar los atributos cq-* del HTML final
        output.Attributes.RemoveAll("cq-btn");
        output.Attributes.RemoveAll("cq-icon");

        // Agregar las clases CQ (preservando las existentes si las hay)
        var existing = output.Attributes["class"]?.Value?.ToString();
        var cqClass = $"cq-btn-icon cq-{BtnType}";
        output.Attributes.SetAttribute("class",
            string.IsNullOrWhiteSpace(existing) ? cqClass : $"{cqClass} {existing}");

        // Inyectar el ícono MDI como contenido del elemento
        output.Content.SetHtmlContent($"<i class=\"mdi mdi-{icon}\"></i>");
    }
}
