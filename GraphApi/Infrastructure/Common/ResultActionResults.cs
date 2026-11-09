using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Infrastructure.Common;

public static class ResultActionResults
{
    public static IActionResult ToActionResult(this Result result)
    {
        if (result.IsSuccess)
        {
            return new OkResult();
        }

        var status = MapStatus(result.Code);
        var problem = new ProblemDetails
        {
            Status = status,
            Title = result.Code,
            Detail = result.Detail,
            Type = $"https://cuartaquinientos/errors/{result.Code.ToLowerInvariant()}"
        };
        problem.Extensions["code"] = result.Code;

        return new ObjectResult(problem) { StatusCode = status };
    }

    private static int MapStatus(string code) => code switch
    {
        "FORBIDDEN" => StatusCodes.Status403Forbidden,
        "NOT_FOUND" => StatusCodes.Status404NotFound,
        "CONFLICT" => StatusCodes.Status409Conflict,
        "VALIDATION_ERROR" => StatusCodes.Status422UnprocessableEntity,
        _ => StatusCodes.Status400BadRequest
    };
}
