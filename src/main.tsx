import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        // Sem audience configurado, o login continua funcionando, mas o
        // token retornado por getAccessTokenSilently() não serve pra
        // autenticar chamadas ao backend (ver docs/backend-api-contract.md).
        ...(import.meta.env.VITE_AUTH0_AUDIENCE
          ? { audience: import.meta.env.VITE_AUTH0_AUDIENCE }
          : {}),
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Auth0Provider>
  </StrictMode>,
)
