namespace GraphApi.Services.FNZ;

public static class CuotaEstadoClassifier
{
    public static (string Estado, bool EsVencida) Clasificar(bool pagado, DateOnly fechaVencimiento, DateOnly hoyLocal)
    {
        if (pagado)
        {
            return ("Pagada", false);
        }

        if (fechaVencimiento < hoyLocal)
        {
            return ("Vencida", true);
        }

        return ("Pendiente", false);
    }
}
