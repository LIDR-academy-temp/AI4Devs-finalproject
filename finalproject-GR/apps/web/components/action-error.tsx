import { ApiError } from '../lib/api-client';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Explains why an action failed: the API's own reason for a 4xx (e.g. "resolve every
 * Needs Review run…"), a rate-limit hint for 429, and a generic message otherwise.
 */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Too many attempts — try again shortly.';
    }
    if (error.status >= 400 && error.status < 500) {
      return error.serverMessage;
    }
  }
  return 'Something went wrong. Please try again.';
}

export function ActionError({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }
  return (
    <Alert variant="destructive">
      <AlertDescription>{actionErrorMessage(error)}</AlertDescription>
    </Alert>
  );
}
