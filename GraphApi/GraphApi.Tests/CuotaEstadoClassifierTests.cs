using GraphApi.Services.FNZ;

namespace GraphApi.Tests;

public class CuotaEstadoClassifierTests
{
    private static readonly DateOnly Hoy = new(2026, 10, 16);

    [Fact]
    public void Pagada_siempre_pagada()
    {
        var (estado, esVencida) = CuotaEstadoClassifier.Clasificar(true, Hoy.AddDays(-1), Hoy);
        Assert.Equal("Pagada", estado);
        Assert.False(esVencida);
    }

    [Fact]
    public void Vence_hoy_es_pendiente()
    {
        var (estado, esVencida) = CuotaEstadoClassifier.Clasificar(false, Hoy, Hoy);
        Assert.Equal("Pendiente", estado);
        Assert.False(esVencida);
    }

    [Fact]
    public void Ayer_es_vencida()
    {
        var (estado, esVencida) = CuotaEstadoClassifier.Clasificar(false, Hoy.AddDays(-1), Hoy);
        Assert.Equal("Vencida", estado);
        Assert.True(esVencida);
    }
}
