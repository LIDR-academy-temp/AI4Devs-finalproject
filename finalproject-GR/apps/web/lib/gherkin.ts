/**
 * Gherkin keywords highlighted at the start of a line (web-ui-foundation). Longer
 * keywords come first so "Scenario Outline" wins over "Scenario".
 */
const KEYWORDS = ['Scenario Outline', 'Scenario Template', 'Background', 'Scenario', 'Examples', 'Feature', 'Given', 'When', 'Then', 'And', 'But'];

export interface GherkinLine {
  /** Leading whitespace, kept so the script's indentation renders as written. */
  indent: string;
  /** The keyword (without its trailing colon), or null when the line doesn't start with one. */
  keyword: string | null;
  /** Everything after the keyword (or after the indent when there's no keyword). */
  rest: string;
  /** A `#` comment line. */
  comment: boolean;
}

/**
 * Splits a line into indentation, a leading keyword, and the rest. Keywords match
 * case-sensitively, as Gherkin does, and only as a whole word at the start of the
 * line — "Thenceforth" or a "Given" mid-sentence is not a keyword.
 */
export function splitKeyword(line: string): GherkinLine {
  const indent = line.match(/^\s*/)![0];
  const body = line.slice(indent.length);

  if (body.startsWith('#')) {
    return { indent, keyword: null, rest: body, comment: true };
  }
  for (const keyword of KEYWORDS) {
    if (body.startsWith(keyword)) {
      const next = body.charAt(keyword.length);
      if (next === '' || next === ' ' || next === ':') {
        return { indent, keyword, rest: body.slice(keyword.length), comment: false };
      }
    }
  }
  return { indent, keyword: null, rest: body, comment: false };
}
