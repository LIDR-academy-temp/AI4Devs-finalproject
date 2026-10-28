import { Folder as FolderIcon } from 'lucide-react';
import { folderCounts, type FolderNode, type TreeNode } from '../../lib/test-case-tree';
import type { TreeAction, TreeActionItem } from './tree-actions';
import { Breadcrumb } from './breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface FolderSummaryProps {
  folder: FolderNode;
  path: string[];
  actions: TreeActionItem[];
  onAction: (action: TreeAction, node: TreeNode) => void;
}

/** Right panel when a folder is selected (PRD §6.2.1): its place, its contents, its actions. */
export function FolderSummary({ folder, path, actions, onAction }: FolderSummaryProps) {
  const counts = folderCounts(folder);
  const stats = [
    { label: 'Subfolders', value: counts.subfolders },
    { label: 'Test cases here', value: counts.directTestCases },
    { label: 'Test cases in total', value: counts.totalTestCases },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <Breadcrumb path={path} />
        <CardTitle className="flex items-center gap-2">
          <FolderIcon className="size-5 text-primary" /> {folder.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="grid grid-cols-3 gap-3" aria-label="Folder contents">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md border px-3 py-2">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map(({ action, label, icon: Icon, destructive }) => (
              <Button
                key={action}
                type="button"
                size="sm"
                variant={destructive ? 'destructive' : 'outline'}
                onClick={() => onAction(action, folder)}
              >
                <Icon /> {label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
