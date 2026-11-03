// Where the focus goes after a write of a fee is accepted (spec fees "Pantalla Account Fees: foco tras escribir y ante
// un error local"): the History button of that fee, found by its id so a renamed or moved row is still found; the
// heading of the table when the fee is no longer in the list.

/** The attribute that marks the History button of a fee in the table. */
export const HISTORY_ATTRIBUTE = 'data-fee-history'

export function focusAfterWrite(feeId: string, heading: HTMLElement | null) {
  const history = document.querySelector<HTMLElement>(`[${HISTORY_ATTRIBUTE}="${CSS.escape(feeId)}"]`)
  ;(history ?? heading)?.focus()
}
