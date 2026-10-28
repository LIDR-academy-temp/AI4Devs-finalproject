'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listTags, tagKeys } from '../../lib/tags-api';
import { TagFilter } from '../tags/tag-filter';
import { useApiClient } from '../../lib/api-client';
import { executionKeys, listExecutions, type Browser, type ExecutionStatus } from '../../lib/executions-api';
import {
  filterExecutions,
  sortExecutions,
  type ExecutionFilters,
  type ExecutionSortKey,
  type SortDirection,
} from '../../lib/execution-list-view';
import { StatusBadge, statusLabel } from './status-badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton } from '../states';

/** Radix Select can't use '' as a value; this stands for "no filter". */
const ALL = '__all__';
const STATUSES: ExecutionStatus[] = ['Draft', 'Ready', 'InProgress', 'Paused', 'Completed', 'Done'];
const BROWSERS: Browser[] = ['Chromium', 'Firefox', 'WebKit'];
const SORT_OPTIONS: { value: `${ExecutionSortKey}:${SortDirection}`; label: string }[] = [
  { value: 'updatedAt:desc', label: 'Last updated (newest)' },
  { value: 'updatedAt:asc', label: 'Last updated (oldest)' },
  { value: 'createdAt:desc', label: 'Created (newest)' },
  { value: 'createdAt:asc', label: 'Created (oldest)' },
  { value: 'status:asc', label: 'Status (Draft → Done)' },
  { value: 'status:desc', label: 'Status (Done → Draft)' },
];

export interface ExecutionListProps {
  projectId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  canCreate: boolean;
  onCreateClick: () => void;
}

export function ExecutionList({ projectId, selectedId, onSelect, canCreate, onCreateClick }: ExecutionListProps) {
  const apiClient = useApiClient();
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('updatedAt:desc');
  const [filters, setFilters] = useState<ExecutionFilters>({});

  const {
    data: executions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: executionKeys.list(projectId),
    queryFn: () => listExecutions(apiClient, projectId),
    // Polling instead of SSE (ADR 0005/0011): only while something is under way.
    refetchInterval: (query) =>
      query.state.data?.some((e) => e.status === 'InProgress' || e.status === 'Paused') ? 10_000 : false,
  });

  // Executions carry no tags themselves; they match on their test cases' tags (PRD §6.3.2).
  const { data: tags = [] } = useQuery({ queryKey: tagKeys.list(projectId), queryFn: () => listTags(apiClient, projectId) });

  const environmentNames = useMemo(
    () => [...new Set(executions.map((e) => e.environmentName).filter((n): n is string => n !== null))].sort(),
    [executions],
  );
  const visible = useMemo(() => {
    const [key, direction] = sort.split(':') as [ExecutionSortKey, SortDirection];
    return sortExecutions(filterExecutions(executions, filters), key, direction);
  }, [executions, filters, sort]);

  const setFilter = <K extends keyof ExecutionFilters>(key: K, value: string) =>
    setFilters((current) => ({ ...current, [key]: value === ALL ? undefined : value }));

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Executions</CardTitle>
        {canCreate && (
          <Button type="button" size="sm" onClick={onCreateClick}>
            New execution
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label="Filter by name"
            placeholder="Filter by name"
            className="col-span-2"
            value={filters.name ?? ''}
            onChange={(event) => setFilter('name', event.target.value)}
          />
          <Select value={filters.status ?? ALL} onValueChange={(value) => setFilter('status', value)}>
            <SelectTrigger aria-label="Filter by status" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.browser ?? ALL} onValueChange={(value) => setFilter('browser', value)}>
            <SelectTrigger aria-label="Filter by browser" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All browsers</SelectItem>
              {BROWSERS.map((browser) => (
                <SelectItem key={browser} value={browser}>
                  {browser}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.environmentName ?? ALL} onValueChange={(value) => setFilter('environmentName', value)}>
            <SelectTrigger aria-label="Filter by environment" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All environments</SelectItem>
              {environmentNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TagFilter
            tags={tags}
            selectedIds={filters.tagIds ?? []}
            onChange={(tagIds) => setFilters((current) => ({ ...current, tagIds }))}
          />
          <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
            <SelectTrigger aria-label="Sort" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <ErrorState message="Couldn't load executions." onRetry={() => refetch()} />
        ) : executions.length === 0 ? (
          <EmptyState
            icon={PlayCircle}
            title="No executions yet."
            description="An execution runs a set of test cases together and records each outcome."
            action={
              canCreate && (
                <Button type="button" size="sm" variant="outline" onClick={onCreateClick}>
                  Create the first execution
                </Button>
              )
            }
          />
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No executions match these filters.</p>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Executions">
            {visible.map((execution) => (
              <li key={execution.id}>
                <button
                  type="button"
                  onClick={() => onSelect(execution.id)}
                  aria-current={execution.id === selectedId ? 'true' : undefined}
                  className={cn(
                    'flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left hover:bg-muted',
                    execution.id === selectedId && 'bg-muted',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{execution.name}</span>
                    <StatusBadge status={execution.status} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {execution.counts.done}/{execution.counts.total} done · {execution.counts.pass} pass ·{' '}
                    {execution.counts.fail} fail · {execution.counts.needsReview} needs review
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(execution.updatedAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
