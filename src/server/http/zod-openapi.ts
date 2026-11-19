import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// With Zod 4, only schemas created after this runs can be registered by name in
// the OpenAPI document, so modules that define such schemas import this first.
extendZodWithOpenApi(z);
