import { NotAvailable } from "@/components/screen-states";

import { loadShell } from "./shell-data";

// A screen the user can't see, inside the shell, with a way back to their main
// screen (BR-13).
export default async function NotFound() {
  const { mainScreen } = await loadShell();
  return <NotAvailable href={mainScreen} />;
}
