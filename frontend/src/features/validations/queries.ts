// Server state of the validations block (design D3). The run and its lists hang from the import's key, so they are
// invalidated together without touching the detail (exact) or the rows.
import type { ValidationCode } from '@recon/shared'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { importKey } from '@/features/imports/queries'
import { getValidationIssue, getValidationRun, listValidationIssues } from './contract'

export const ISSUES_PAGE_SIZE = 50

export const validationRunKey = (importId: string) => [...importKey(importId), 'validations'] as const

export const validationRunQuery = (importId: string) =>
  queryOptions({
    queryKey: validationRunKey(importId),
    queryFn: () => getValidationRun(importId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

export const validationIssuesQuery = (
  importId: string,
  { validationCode, page }: { validationCode: ValidationCode; page: number },
) =>
  queryOptions({
    queryKey: [...validationRunKey(importId), 'issues', { validationCode, page }] as const,
    queryFn: () => listValidationIssues(importId, { validationCode, page, pageSize: ISSUES_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

export const validationIssueKey = (issueId: number) => ['validation-issues', issueId] as const

export const validationIssueQuery = (issueId: number) =>
  queryOptions({ queryKey: validationIssueKey(issueId), queryFn: () => getValidationIssue(issueId) })
