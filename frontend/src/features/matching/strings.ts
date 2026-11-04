// Visible texts of the Matching Rules screens (web-admin-matching).
export const strings = {
  title: 'Matching Rules',
  globalTitle: 'Global defaults',
  ruleSetTitleLoading: 'Rule set',
  form: {
    /** What the *Input schemas reject before sending (design D4). */
    local: {
      pattern: 'Enter a pattern.',
      aliasText: 'Enter the text.',
      tooLong: (max: number) => `At most ${max} characters.`,
      priority: 'Enter a whole number from 0 to 32767.',
      status: 'Choose a status.',
      invalid: 'Check this value.',
    },
    /** What a failed write shows (design D6). */
    errors: {
      invalid: 'The rules were not saved. Check the values and try again.',
      nameTaken: 'A rule set of this provider already uses this name.',
      forbidden: "You don't have permission to change these rules.",
      notFound: 'This rule set is no longer available.',
      saveFailed: 'Could not save the rules. Try again.',
      unreachable: 'Could not reach the server. Check your connection and try again.',
    },
  },
}
