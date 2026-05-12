<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Socra's React + Vite frontend. PostHog is initialized in `src/main.jsx` with the `PostHogProvider` wrapping the entire app. Users are identified on login/signup using their Supabase user ID and email, and `posthog.reset()` is called on sign-out. Fifteen events are tracked across seven files, covering the full student lifecycle from question selection to session completion and premium conversion.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User created a new account (email/password) | `src/components/auth/LoginScreen.jsx` |
| `user_signed_in` | User signed in with email/password | `src/components/auth/LoginScreen.jsx` |
| `user_signed_in_google` | User initiated Google OAuth sign-in | `src/components/auth/LoginScreen.jsx` |
| `question_selected` | User picked a past-year or custom GP question | `src/components/ThemeSelection.jsx` |
| `theme_selected` | User selected a GP theme to browse conflicts | `src/components/ThemeSelection.jsx` |
| `mode_selected` | User chose Learn First or Think It Through | `src/components/ModeChoice.jsx` |
| `session_started` | New Socratic session created successfully | `src/App.jsx` |
| `session_resumed` | User resumed an existing session from My Sessions | `src/components/bank/SavedBlueprints.jsx` |
| `message_sent` | User submitted a chat message to SocraAI | `src/components/ChatInterface.jsx` |
| `phase_advanced` | Session advanced to a new Socratic phase | `src/components/ChatInterface.jsx` |
| `session_completed` | User reached Phase 6 — inquiry complete | `src/components/ChatInterface.jsx` |
| `blueprint_exported` | User copied essay blueprint to clipboard | `src/components/FinalBlueprint.jsx` |
| `blueprint_saved_to_bank` | User saved blueprint to knowledge bank | `src/components/FinalBlueprint.jsx` |
| `premium_modal_shown` | User hit session limit; premium modal displayed | `src/App.jsx` |
| `waitlist_joined` | User submitted email to join premium waitlist | `src/components/PremiumModal.jsx` |

## Next steps

We've built a dashboard and five insights to monitor user behaviour based on the events just instrumented:

- [Analytics basics dashboard](/dashboard/1574611)
- [User Signups & Sign-ins over Time](/insights/ZRPfkvrT) — top-of-funnel acquisition
- [Core Conversion Funnel](/insights/QeCo7jXC) — sign up → start session → complete session
- [Daily Chat Engagement (Messages Sent)](/insights/lkvs26TB) — daily messages + active students
- [Premium Modal → Waitlist Conversion](/insights/xCazJTKd) — churn/upsell conversion rate
- [Session Completions & Blueprint Saves](/insights/pzkfO7Kw) — deepest engagement metric

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
