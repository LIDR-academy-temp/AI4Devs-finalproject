/**
 * `ImportSheet.kind` is NOT NULL, but a sheet that matches no rule has no proposal. Until the mapping
 * is confirmed (#5), such a sheet is persisted with this marker; the API still reports it as
 * `kind: null, source: none` and the analysis refuses any sheet whose mapping is not confirmed, so the
 * marker never ignores data silently. Registered debt (design D7): make `kind` nullable in a future
 * schema change and retire the marker.
 */
export const UNPROPOSED_SHEET_KIND = 'ignore' as const
