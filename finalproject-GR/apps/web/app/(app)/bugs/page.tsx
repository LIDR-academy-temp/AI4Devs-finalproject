import { Suspense } from 'react';
import { BugsScreen } from '../../../components/bugs/bugs-screen';

// BugsScreen reads the selected bug from useSearchParams, which needs a Suspense
// boundary so the rest of the route can still be prerendered (Next 16 docs).
export default function BugsPage() {
  return (
    <Suspense fallback={null}>
      <BugsScreen />
    </Suspense>
  );
}
