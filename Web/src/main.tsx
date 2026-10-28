import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { NavegacionProvider } from './features/navegacion/NavegacionContext'
import { apolloClient } from './shared/lib/apolloClient'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <NavegacionProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </NavegacionProvider>
      </AuthProvider>
    </ApolloProvider>
  </StrictMode>,
)
