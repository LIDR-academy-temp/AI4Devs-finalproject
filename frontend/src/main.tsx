import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { createAppRouter } from './app/router'
import { createQueryClient } from './lib/query-client'
import './index.css'

const queryClient = createQueryClient()
const router = createAppRouter({ queryClient })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App router={router} queryClient={queryClient} />
  </StrictMode>,
)
