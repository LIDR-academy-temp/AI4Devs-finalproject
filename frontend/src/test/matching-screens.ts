// Helpers shared by the tests of the Matching Rules screens (web-admin-matching).
import { screen, within } from '@testing-library/react'

/** The text of each cell of each body row of a table, found by its accessible name. */
export async function tableRows(name: string) {
  const table = await screen.findByRole('table', { name })
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    )
}

/** The write actions of the rule screens, by their visible names. */
export const WRITE_ACTIONS = ['New rule set', 'Edit rules', 'Rename…', 'Deactivate…', 'Activate…']

export function writeActions() {
  return WRITE_ACTIONS.filter((name) => screen.queryByRole('button', { name }))
}
