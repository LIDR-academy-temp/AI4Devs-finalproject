'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../lib/api-client';
import { BUG_SEVERITIES, BUG_STATUSES, BUG_STATUS_LABELS, bugKeys, listBugs } from '../../lib/bugs-api';
import { filterBugs, sortBugs, type BugFilters, type BugSortKey } from '../../lib/bug-list-view';
import type { SortDirection } from '../../lib/execution-list-view';
import { BugStatusBadge, SeverityDot } from './bug-badges';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bug as BugIcon } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton } from '../states';

/** Radix Select can't use '' as a value; this stands for "no filter". */
const ALL = '__all__';
const SORT_OPTIONS: { value: `${BugSortKey}:${SortDirection}`; label: string }[] = [
  { value: 'updatedAt:desc', label: 'Last updated (newest)' },
  { value: 'updatedAt:asc', label: 'Last updated (oldest)' },
  { value: 'createdAt:desc', label: 'Created (newest)' },
  { value: 'createdAt:asc', label: 'Created (oldest)' },
  { value: 'severity:desc', label: 'Severity (Critical → Low)' },
  { value: 'severity:asc', label: 'Severity (Low → Critical)' },
  { value: 'status:asc', label: 'Status (Open → Won’t Fix)' },
  { value: 'status:desc', label: 'Status (Won’t Fix → Open)' },
];

export interface BugListProps {
  projectId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  canCreate: boolean;
  onCreateClick: () => void;
}

export function BugList({ projectId, selectedId, onSelect, canCreate, onCreateClick }: BugListProps) {
  const apiClient = useApiClient();
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('updatedAt:desc');
  const [filters, setFilters] = useState<BugFilters>({});

  const {
    data: bugs = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: bugKeys.list(projectId),
    queryFn: () => listBugs(apiClient, projectId),
  });

  const visible = useMemo(() => {
    const [key, direction] = sort.split(':') as [BugSortKey, SortDirection];
    return sortBugs(filterBugs(bugs, filters), key, direction);
  }, [bugs, filters, sort]);

  const setFilter = <K extends keyof BugFilters>(key: K, value: string) =>
    setFilters((current) => ({ ...current, [key]: value === ALL ? undefined : value }));

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bugs</CardTitle>
        {canCreate && (
          <Button type="button" size="sm" onClick={onCreateClick}>
            New bug
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label="Filter by title"
            placeholder="Filter by title"
            className="col-span-2"
            value={filters.title ?? ''}
            onChange={(event) => setFilter('title', event.target.value)}
          />
          <Select value={filters.status ?? ALL} onValueChange={(value) => setFilter('status', value)}>
            <SelectTrigger aria-label="Filter by status" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {BUG_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {BUG_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.severity ?? ALL} onValueChange={(value) => setFilter('severity', value)}>
            <SelectTrigger aria-label="Filter by severity" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All severities</SelectItem>
              {BUG_SEVERITIES.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {severity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
            <SelectTrigger aria-label="Sort" size="sm" className="col-span-2 w-full">
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
          <ErrorState message="Couldn't load bugs." onRetry={() => refetch()} />
        ) : bugs.length === 0 ? (
          <EmptyState
            icon={BugIcon}
            title="No bugs yet."
            description="Bugs record defects found while testing, usually filed from a failing run."
            action={
              canCreate && (
                <Button type="button" size="sm" variant="outline" onClick={onCreateClick}>
                  File the first bug
                </Button>
              )
            }
          />
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bugs match these filters.</p>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Bugs">
            {visible.map((bug) => (
              <li key={bug.id}>
                <button
                  type="button"
                  onClick={() => onSelect(bug.id)}
                  aria-current={bug.id === selectedId ? 'true' : undefined}
                  className={cn(
                    'flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left hover:bg-muted',
                    bug.id === selectedId && 'bg-muted',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{bug.title}</span>
                    <BugStatusBadge status={bug.status} />
                  </span>
                  <SeverityDot severity={bug.severity} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
