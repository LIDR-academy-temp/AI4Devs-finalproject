import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  checkDocument,
  documentAnchors,
  githubSlug,
} from "../../scripts/doc-links";

describe("githubSlug", () => {
  it.each([
    ["1. System architecture", "1-system-architecture"],
    ["1.6 Dependencies", "16-dependencies"],
    [
      "T-01 Repository, project scaffold, and CI",
      "t-01-repository-project-scaffold-and-ci",
    ],
    ["Branches, commits and PRs", "branches-commits-and-prs"],
    [
      "2.5 Running tests locally and in CI",
      "25-running-tests-locally-and-in-ci",
    ],
    ["Using `snake_case` here", "using-snake_case-here"],
    ["A **bold** word", "a-bold-word"],
    ["See [the docs](other.md)", "see-the-docs"],
    ["Instalación rápida", "instalación-rápida"],
    ["C4 model · level 2", "c4-model--level-2"],
  ])("turns %j into %j", (heading, slug) => {
    expect(githubSlug(heading)).toBe(slug);
  });
});

describe("documentAnchors", () => {
  it("numbers repeated headings the way GitHub does", () => {
    const anchors = documentAnchors("# Notes\n\n## Notes\n\n### Notes\n");
    expect([...anchors]).toEqual(["notes", "notes-1", "notes-2"]);
  });

  it("ignores headings inside code blocks and accepts HTML anchors", () => {
    const anchors = documentAnchors(
      '```\n# Not a heading\n```\n\n<a id="custom"></a>\n',
    );
    expect([...anchors]).toEqual(["custom"]);
  });
});

describe("checkDocument", () => {
  let root: string;
  const check = (name: string, content: string) => {
    const path = join(root, name);
    writeFileSync(path, content);
    return checkDocument(root, path).map(({ target, reason, line }) => ({
      target,
      reason,
      line,
    }));
  };

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "doc-links-"));
    mkdirSync(join(root, "docs"));
    mkdirSync(join(root, "src/app/(public)"), { recursive: true });
    writeFileSync(join(root, "src/app/(public)/page.tsx"), "");
    writeFileSync(
      join(root, "docs/guide.md"),
      "# Guide\n\n## 1. How it works\n",
    );
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("passes valid links and anchors", () => {
    const broken = check(
      "valid.md",
      [
        "# Valid",
        "[file](docs/guide.md)",
        "[anchor](docs/guide.md#1-how-it-works)",
        "[same file](#valid)",
        "[folder](docs/)",
        "[parentheses](src/app/(public)/page.tsx)",
        '[title](docs/guide.md "The guide")',
        "[from root](/docs/guide.md)",
        "[ref]: docs/guide.md",
      ].join("\n"),
    );
    expect(broken).toEqual([]);
  });

  it("fails a link to a missing file and names it", () => {
    expect(check("file.md", "\n[gone](docs/gone.md)\n")).toEqual([
      { target: "docs/gone.md", reason: "file not found", line: 2 },
    ]);
  });

  it("fails a link to a missing heading in an existing file", () => {
    expect(check("anchor.md", "[gone](docs/guide.md#gone)\n")).toEqual([
      { target: "docs/guide.md#gone", reason: "heading not found", line: 1 },
    ]);
  });

  it("fails a link to a missing heading in the same file", () => {
    expect(check("self.md", "# Self\n[gone](#gone)\n")).toEqual([
      { target: "#gone", reason: "heading not found", line: 2 },
    ]);
  });

  it("reports invalid encoding instead of stopping", () => {
    expect(
      check("encoding.md", "[bad](docs/100%.md) [bad](docs/guide.md#100%)\n"),
    ).toEqual([
      { target: "docs/100%.md", reason: "invalid encoding", line: 1 },
      { target: "docs/guide.md#100%", reason: "invalid encoding", line: 1 },
    ]);
  });

  it("skips code blocks and inline code", () => {
    const broken = check(
      "code.md",
      "```\n[gone](gone.md)\n```\n\nUse `[gone](gone.md)` here.\n",
    );
    expect(broken).toEqual([]);
  });

  it("skips external links without using the network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const broken = check(
      "external.md",
      "[site](https://example.com/gone) [mail](mailto:a@example.com)\n",
    );
    expect(broken).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
