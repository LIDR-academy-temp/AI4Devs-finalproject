import { describe, expect, it } from "vitest";

import en from "../../src/i18n/en.json";
import es from "../../src/i18n/es.json";

// Both languages need every message (FR-37; docs/07-SECURITY-AND-TESTING.md, section 2.2).

function keys(messages: object, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("translation files", () => {
  it("the Spanish and English files have the same keys", () => {
    expect(keys(es).sort()).toEqual(keys(en).sort());
  });

  it("no message is empty", () => {
    for (const messages of [en, es]) {
      const values = JSON.stringify(messages);
      expect(values).not.toMatch(/:\s*""/);
    }
  });
});
