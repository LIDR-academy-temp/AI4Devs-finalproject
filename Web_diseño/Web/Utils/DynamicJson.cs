
using System.Dynamic;
using System.Text.Json;

public static class DynamicJson
{
    public static dynamic FromDictionary(IDictionary<string, object?> dict)
        => ToExpando(dict);

    private static ExpandoObject ToExpando(IDictionary<string, object?> dict)
    {
        var exp = new ExpandoObject();
        var bag = (IDictionary<string, object?>)exp;

        foreach (var (key, val) in dict)
            bag[key] = ConvertValue(val);

        return exp;
    }

    private static object? ConvertValue(object? value)
    {
        if (value is JsonElement je) return ConvertJsonElement(je);
        if (value is IDictionary<string, object?> nestedDict) return ToExpando(nestedDict);
        // Si alguna lib te da listas reales:
        if (value is System.Collections.IEnumerable seq && value is not string)
        {
            var list = new List<object?>();
            foreach (var item in seq) list.Add(ConvertValue(item));
            return list;
        }
        return value;
    }

    private static object? ConvertJsonElement(JsonElement e)
    {
        switch (e.ValueKind)
        {
            case JsonValueKind.Object:
                var obj = new ExpandoObject() as IDictionary<string, object?>;
                foreach (var p in e.EnumerateObject())
                    obj[p.Name] = ConvertJsonElement(p.Value);
                return (ExpandoObject)obj;

            case JsonValueKind.Array:
                var list = new List<object?>();
                foreach (var item in e.EnumerateArray())
                    list.Add(ConvertJsonElement(item));
                return list;

            case JsonValueKind.String: return e.GetString();
            case JsonValueKind.Number:
                if (e.TryGetInt64(out var i64)) return i64;
                if (e.TryGetDecimal(out var dec)) return dec;
                return e.GetDouble();
            case JsonValueKind.True: return true;
            case JsonValueKind.False: return false;
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
            default: return null;
        }
    }
}
