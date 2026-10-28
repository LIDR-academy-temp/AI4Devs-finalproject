import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function AccessDenied({ message = "You don't have access to this project." }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
