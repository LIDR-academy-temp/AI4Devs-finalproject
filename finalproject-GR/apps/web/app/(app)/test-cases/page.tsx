import { Suspense } from 'react';
import { TestCasesScreen } from '../../../components/test-cases/test-cases-screen';

// TestCasesScreen reads `?testCase=` via useSearchParams, which needs a Suspense
// boundary so the rest of the route can still be prerendered (Next 16 docs).
export default function TestCasesPage() {
  return (
    <Suspense fallback={null}>
      <TestCasesScreen />
    </Suspense>
  );
}
