using GraphApi.Models.TKT.Tickets;

namespace GraphApi.Tests;

public class TicketStatusTransitionsTests
{
    [Theory]
    [InlineData("Nuevo", "En seguimiento", true)]
    [InlineData("Nuevo", "Cerrado", true)]
    [InlineData("Nuevo", "Resuelto", false)]
    [InlineData("Cerrado", "Nuevo", false)]
    public void IsValid_matches_readme_matrix(string from, string to, bool expected)
    {
        Assert.Equal(expected, TicketStatusTransitions.IsValid(from, to));
    }
}
