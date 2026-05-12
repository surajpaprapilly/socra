import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import posthog from 'posthog-js'
import { PostHogProvider } from '@posthog/react'

if (import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN) {
  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    defaults: '2026-01-30',
  })
}

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  document.getElementById('root').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1610;font-family:Georgia,serif;">
      <div style="text-align:center;max-width:420px;padding:2rem;">
        <p style="color:#c9a84c;font-size:0.75rem;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:1rem;">Configuration Error</p>
        <h1 style="color:#e8e0d0;font-size:1.5rem;margin-bottom:1rem;">Missing API URL</h1>
        <p style="color:#9a8a7a;font-size:0.9rem;line-height:1.6;">
          <code style="background:#2a2010;padding:0.2em 0.4em;border-radius:3px;color:#c9a84c;">VITE_API_URL</code>
          is not set. Add this environment variable in your Vercel project settings before deploying.
        </p>
      </div>
    </div>
  `;
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <PostHogProvider client={posthog}>
        <App />
      </PostHogProvider>
    </StrictMode>,
  );
}
