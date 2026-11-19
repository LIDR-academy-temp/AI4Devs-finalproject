import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

export type BrokenLink = {
  file: string;
  line: number;
  target: string;
  reason: string;
};

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const INLINE_CODE = /(`+)(?:(?!\1).)+\1/g;
// [text](target "title") and ![alt](target). The target may hold one level of
// parentheses, as in src/app/(public)/page.tsx.
const INLINE_LINK =
  /\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))*)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
const REFERENCE_LINK = /^ {0,3}\[[^\]]+\]:\s+<?(\S+?)>?(?:\s|$)/;
const HEADING = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/;
const HTML_ANCHOR = /<a\s[^>]*\b(?:id|name)=["']([^"']+)["']/g;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** The lines outside fenced code blocks, with their 1-based line numbers. */
function proseLines(markdown: string): { text: string; number: number }[] {
  const lines: { text: string; number: number }[] = [];
  let fence: string | undefined;

  markdown.split(/\r?\n/).forEach((text, index) => {
    const marker = FENCE.exec(text)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) {
        fence = undefined;
      }
    } else if (marker) {
      fence = marker;
    } else {
      lines.push({ text, number: index + 1 });
    }
  });

  return lines;
}

/** The anchor GitHub gives a heading, before duplicates are numbered. */
export function githubSlug(heading: string): string {
  return heading
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links and images keep their text
    .replace(/<[^>]+>/g, "") // inline HTML
    .replace(/[`*]/g, "") // code and emphasis markers
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}_\- ]/gu, "")
    .replace(/ /g, "-");
}

/** Every anchor a document offers: its headings, numbered like GitHub, and HTML anchors. */
export function documentAnchors(markdown: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();

  for (const { text } of proseLines(markdown)) {
    const heading = HEADING.exec(text)?.[1];
    if (heading) {
      const slug = githubSlug(heading);
      const count = seen.get(slug) ?? 0;
      seen.set(slug, count + 1);
      anchors.add(count === 0 ? slug : `${slug}-${count}`);
    }
    for (const match of text.matchAll(HTML_ANCHOR)) {
      anchors.add(match[1]);
    }
  }

  return anchors;
}

/** Every link in a document, skipping code blocks and inline code. */
export function documentLinks(
  markdown: string,
): { target: string; line: number }[] {
  const links: { target: string; line: number }[] = [];

  for (const { text, number } of proseLines(markdown)) {
    const prose = text.replace(INLINE_CODE, "");
    for (const match of prose.matchAll(INLINE_LINK)) {
      links.push({ target: match[1], line: number });
    }
    const reference = REFERENCE_LINK.exec(prose)?.[1];
    if (reference) {
      links.push({ target: reference, line: number });
    }
  }

  return links;
}

function decoded(text: string): string | undefined {
  try {
    return decodeURIComponent(text);
  } catch {
    return undefined;
  }
}

/** Checks one document's links and anchors. Never uses the network. */
export function checkDocument(
  root: string,
  documentPath: string,
): BrokenLink[] {
  const broken: BrokenLink[] = [];
  const file = relative(root, documentPath);
  const markdown = readFileSync(documentPath, "utf8");

  for (const { target, line } of documentLinks(markdown)) {
    if (EXTERNAL.test(target) || target === "") {
      continue;
    }

    const [rawPath, rawAnchor] = target.split("#", 2);
    const path = decoded(rawPath.split("?", 1)[0]);
    const anchor = rawAnchor ? decoded(rawAnchor) : "";
    if (path === undefined || anchor === undefined) {
      broken.push({ file, line, target, reason: "invalid encoding" });
      continue;
    }

    const targetPath =
      path === ""
        ? documentPath
        : path.startsWith("/")
          ? join(root, path)
          : resolve(dirname(documentPath), path);

    if (!existsSync(targetPath)) {
      broken.push({ file, line, target, reason: "file not found" });
      continue;
    }

    if (
      anchor &&
      extname(targetPath) === ".md" &&
      !documentAnchors(readFileSync(targetPath, "utf8")).has(anchor)
    ) {
      broken.push({ file, line, target, reason: "heading not found" });
    }
  }

  return broken;
}
