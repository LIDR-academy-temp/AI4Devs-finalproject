import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect } from 'react'
import { session } from '@/lib/session/session'
import type { AppRouter } from './router'

export function App({ router, queryClient }: { router: AppRouter; queryClient: QueryClient }) {
  // An unrenewable session drops every cached answer and sends the user to Login, remembering where they were.
  useEffect(
    () =>
      session.onExpire(() => {
        queryClient.clear()
        const { pathname, href } = router.state.location
        void router.navigate({
          to: '/login',
          search: { redirect: pathname === '/login' ? undefined : href, reason: 'expired' },
          replace: true,
        })
      }),
    [router, queryClient],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
