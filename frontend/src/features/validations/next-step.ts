// The step after a validated import (web-validations design D9, web-settlement design D13): the route of Settlement
// Review of an import, and the Settlement Summary of a processed one.
export const settlementReviewRoute = (importId: string) =>
  ({ to: '/imports/$importId/settlement-review', params: { importId } }) as const

export const settlementSummaryRoute = (batchId: string) =>
  ({ to: '/settlements/$batchId', params: { batchId } }) as const
