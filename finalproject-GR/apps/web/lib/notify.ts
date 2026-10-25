import { toast } from 'sonner';

/**
 * Confirms a successful action with a brief toast (web-ui-foundation). Failures are
 * deliberately not toasted: they stay inline next to their control (ActionError).
 * One wrapper so tests mock a single function.
 */
export function notifySuccess(message: string): void {
  toast.success(message);
}
