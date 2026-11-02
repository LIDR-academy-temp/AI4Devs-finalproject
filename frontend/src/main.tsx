import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ProveedorDeSesion } from './servicios/sesion'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorDeSesion>
        <App />
      </ProveedorDeSesion>
    </BrowserRouter>
  </StrictMode>,
)
