import { ChevronRight, Home } from 'lucide-react';

/** A test case's or folder's path through the folder hierarchy (PRD §6.2.3). */
export function Breadcrumb({ path }: { path: string[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <Home className="size-3.5" aria-label="Root" />
      {path.map((name, index) => (
        <span key={`${index}-${name}`} className="flex items-center gap-1">
          <ChevronRight className="size-3" aria-hidden />
          <span>{name}</span>
        </span>
      ))}
    </nav>
  );
}
