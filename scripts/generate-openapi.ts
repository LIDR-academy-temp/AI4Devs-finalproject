import { writeFileSync } from "node:fs";
import { relative } from "node:path";

import { buildOpenApiYaml, OPENAPI_PATH } from "./openapi-document";

// `npm run openapi:generate`: writes docs/openapi.yaml. CI fails when the
// committed file differs from what this writes.

async function main() {
  writeFileSync(OPENAPI_PATH, await buildOpenApiYaml());
  console.log(`Wrote ${relative(process.cwd(), OPENAPI_PATH)}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
