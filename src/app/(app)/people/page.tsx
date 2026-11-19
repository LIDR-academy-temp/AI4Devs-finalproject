import { PlaceholderScreen, placeholderMetadata } from "../placeholder-screen";
import { requireTab } from "../shell-data";

// Placeholder until its ticket builds the screen (design decision 6 of the
// T-05 change).

export function generateMetadata() {
  return placeholderMetadata("people");
}

export default async function Page() {
  await requireTab("people");
  return <PlaceholderScreen tab="people" />;
}
