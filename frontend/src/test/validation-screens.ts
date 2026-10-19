/**
 * Wait for the first content of an Analysis step after `renderApp` in the validations tests. Measured on the rebase
 * of web-validations: the first render of a file takes ~750 ms to the validation results in isolation (~370 ms warm)
 * and over a second with the whole suite in parallel, because it chains me → import → run → finding. Only these
 * opening waits are longer; every assertion keeps the default wait of Testing Library.
 */
export const OPENING = { timeout: 5000 }
