/*
 * Calcula el total de un precio incluyendo el impuesto.
 * @param {number} precio - El precio base.
 * @param {number} impuesto - El impuesto en forma decimal (ej: 0.15 para 15%).
 * @returns {number} El total calculado.
 */
function calcularTotal(precio, impuesto) {
    // Calcula el monto del impuesto
    const impuestoCalculado = precio * impuesto;
    // Suma el impuesto al precio base para obtener el total
    const total = precio + impuestoCalculado;
    return total;
}