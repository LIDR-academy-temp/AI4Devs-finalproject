import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect } from 'react'
import { safeRedirect } from '@/features/auth/redirect'
import { session } from '@/lib/session/session'
import type { AppRouter } from './router'

export function App({ router, queryClient }: { router: AppRouter; queryClient: QueryClient }) {
  useEffect(() => {
    const toLogin = (search: { redirect?: string; reason?: 'expired' }) => {
      queryClient.clear()
      void router.navigate({ to: '/login', search, replace: true })
    }
    const unsubscribe = [
      // An unrenewable session: back to Login, remembering where the user was.
      session.onExpire(() => {
        const { pathname, href } = router.state.location
        toLogin({ redirect: pathname === '/login' ? undefined : href, reason: 'expired' })
      }),
      // Signed out in another tab: this one leaves too, without keeping any data.
      session.onLogout(() => toLogin({})),
      // Signed in in another tab: a tab waiting on Login goes where it was heading.
      session.onLogin(() => {
        const { pathname, search } = router.state.location
        if (pathname !== '/login') return
        const target = safeRedirect('redirect' in search ? search.redirect : undefined)
        void (target ? router.navigate({ href: target }) : router.navigate({ to: '/' }))
      }),
    ]
    return () => {
      for (const off of unsubscribe) off()
    }
  }, [router, queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
