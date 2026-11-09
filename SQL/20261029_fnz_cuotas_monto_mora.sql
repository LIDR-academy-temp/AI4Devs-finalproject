-- Monto de mora por cuota vencida (independiente del monto base de mantenimiento).
IF COL_LENGTH(N'fnz.Cuotas', N'MontoMora') IS NULL
BEGIN
    ALTER TABLE fnz.Cuotas
        ADD MontoMora DECIMAL(18, 2) NOT NULL
            CONSTRAINT DF_fnz_Cuotas_MontoMora DEFAULT ((0));
END
GO
