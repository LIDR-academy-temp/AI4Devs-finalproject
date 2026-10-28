using GraphApi.Models.SGR.Navegacion;

namespace GraphApi.Services.SGR.Navegacion;

public static class MenuArbolBuilder
{
    public static IReadOnlyList<MenuNodoDto> Construir(IReadOnlyList<MenuPerfilRow> filas)
    {
        if (filas.Count == 0)
        {
            return Array.Empty<MenuNodoDto>();
        }

        var nodos = filas
            .GroupBy(f => f.MenuId)
            .Select(g => g.First())
            .ToDictionary(
                f => f.MenuId,
                f => new MenuNodoDto
                {
                    MenuId = f.MenuId,
                    Titulo = f.TituloMenu,
                    Ruta = f.Ruta,
                    Icono = f.Icono,
                    Orden = f.Orden,
                    Hijos = new List<MenuNodoDto>()
                });

        var raices = new List<MenuNodoDto>();
        foreach (var fila in filas.GroupBy(f => f.MenuId).Select(g => g.First()))
        {
            var nodo = nodos[fila.MenuId];
            if (fila.PadreMenuId is int padreId && nodos.TryGetValue(padreId, out var padre))
            {
                ((List<MenuNodoDto>)padre.Hijos).Add(nodo);
            }
            else
            {
                raices.Add(nodo);
            }
        }

        OrdenarRecursivo(raices);
        return raices;
    }

    private static void OrdenarRecursivo(List<MenuNodoDto> nodos)
    {
        nodos.Sort((a, b) => a.Orden.CompareTo(b.Orden));
        foreach (var n in nodos)
        {
            if (n.Hijos is List<MenuNodoDto> hijos)
            {
                OrdenarRecursivo(hijos);
            }
        }
    }
}
