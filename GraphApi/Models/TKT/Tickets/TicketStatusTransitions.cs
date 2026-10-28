namespace GraphApi.Models.TKT.Tickets
{
    /// <summary>
    /// Define las transiciones de estado válidas para Tickets.
    /// Mapa: EstadoActualID → HashSet de EstadoSiguienteID permitidos.
    /// Los IDs se resuelven por nombre desde la BD — este mapa usa nombres de estado.
    /// </summary>
    public static class TicketStatusTransitions
    {
        /// <summary>
        /// Transiciones válidas por nombre de estado.
        /// Nuevo → En seguimiento | Cerrado
        /// En seguimiento → Resuelto | Cerrado
        /// Resuelto → Cerrado | En seguimiento (reapertura)
        /// Cerrado → (ninguna — estado terminal)
        /// </summary>
        private static readonly Dictionary<string, HashSet<string>> _validTransitions =
            new(StringComparer.OrdinalIgnoreCase)
            {
                { "Nuevo",          new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "En seguimiento", "Cerrado" } },
                { "En seguimiento", new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Resuelto", "Cerrado" } },
                { "Resuelto",       new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Cerrado", "En seguimiento" } },
                { "Cerrado",        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { } },
            };

        /// <summary>
        /// Valida si la transición de <paramref name="fromEstado"/> a <paramref name="toEstado"/> es permitida.
        /// </summary>
        public static bool IsValid(string fromEstado, string toEstado)
        {
            if (!_validTransitions.TryGetValue(fromEstado, out var allowed))
                return false; // estado origen desconocido
            return allowed.Contains(toEstado);
        }

        /// <summary>
        /// Retorna los estados destino permitidos desde <paramref name="fromEstado"/>.
        /// </summary>
        public static IReadOnlySet<string> GetAllowed(string fromEstado)
        {
            return _validTransitions.TryGetValue(fromEstado, out var allowed)
                ? allowed
                : new HashSet<string>();
        }
    }
}
