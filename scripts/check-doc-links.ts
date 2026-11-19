import { lstatSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { checkDocument } from "./doc-links";

const ROOT = process.cwd();
// Exported sessions and archived changes are history, so their links stay as they
// were written.
const EXCLUDED = new Set(["docs/ai-conversations", "openspec/changes/archive"]);

function markdownFiles(folder: string, recursive: boolean): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (EXCLUDED.has(relative(ROOT, path))) {
      return [];
    }
    if (entry.isDirectory()) {
      return recursive ? markdownFiles(path, true) : [];
    }
    // AGENTS.md is a link to CLAUDE.md, so checking it again would add nothing.
    return entry.name.endsWith(".md") && !lstatSync(path).isSymbolicLink()
      ? [path]
      : [];
  });
}

const documents = [
  ...markdownFiles(ROOT, false),
  ...markdownFiles(join(ROOT, "docs"), true),
  ...markdownFiles(join(ROOT, "openspec"), true),
];
const broken = documents.flatMap((document) => checkDocument(ROOT, document));

for (const { file, line, target, reason } of broken) {
  console.error(`${file}:${line}  ${target}  (${reason})`);
}

if (broken.length > 0) {
  console.error(
    `\n${broken.length} broken link(s) in ${documents.length} documents.`,
  );
  process.exit(1);
}

console.log(`All links resolve in ${documents.length} documents.`);
