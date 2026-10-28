using GraphApi.Infrastructure.Common;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Tests;

public class ResultActionResultsTests
{
    [Fact]
    public void Fail_conflict_maps_to_409_problem_details_with_code()
    {
        var action = Result.Fail("CONFLICT", "duplicado").ToActionResult();

        var objectResult = Assert.IsType<ObjectResult>(action);
        Assert.Equal(409, objectResult.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("CONFLICT", problem.Title);
        Assert.True(problem.Extensions.ContainsKey("code"));
        Assert.Equal("CONFLICT", problem.Extensions["code"]?.ToString());
    }
}
