import { PlaceholderScreen, placeholderMetadata } from "../placeholder-screen";
import { requireTab } from "../shell-data";

// Placeholder until its ticket builds the screen (design decision 6 of the
// T-05 change).

export function generateMetadata() {
  return placeholderMetadata("purchases");
}

export default async function Page() {
  await requireTab("purchases");
  return <PlaceholderScreen tab="purchases" />;
}
