import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// GoogleOAuthProvider crashes with an empty clientId — only wrap when one is set
const Root = CLIENT_ID
  ? () => (
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <App googleEnabled />
      </GoogleOAuthProvider>
    )
  : () => <App googleEnabled={false} />

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
