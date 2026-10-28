import { Suspense } from 'react';
import { ExecutionsScreen } from '../../../components/executions/executions-screen';

// ExecutionsScreen reads the selected execution from useSearchParams, which needs a
// Suspense boundary so the rest of the route can still be prerendered (Next 16 docs).
export default function ExecutionsPage() {
  return (
    <Suspense fallback={null}>
      <ExecutionsScreen />
    </Suspense>
  );
}
