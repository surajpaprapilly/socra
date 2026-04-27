# App.jsx — Changes needed for the streamlined flow

Below are the exact changes to make in `src/App.jsx`.
Everything not mentioned stays the same.

---

## 1. New imports (add at top)

```jsx
import AppShell from './components/AppShell';
import HomeView from './components/HomeView';
```

Remove these imports (the components are no longer routed directly):
```jsx
// DELETE these two lines:
import ThemeSelection from './components/ThemeSelection';
import ModeChoice from './components/ModeChoice';
```

---

## 2. Hide NavBar on shell routes

Add `useLocation` to the existing destructure if it isn't already there,
then add this inside `AppRoutes()`, before the return:

```jsx
const location = useLocation(); // already exists — no change needed

const shellPaths = ['/app', '/test', '/learn', '/bank', '/profile'];
const isShellRoute = shellPaths.some(p => location.pathname.startsWith(p));
```

---

## 3. Update the root div + NavBar rendering

Find this block:
```jsx
<div className="min-h-screen bg-background text-textDefault relative overflow-x-hidden font-mono pt-16">
  <div className="noise-overlay"></div>
  <NavBar />
```

Replace with:
```jsx
<div className={`min-h-screen bg-background text-textDefault relative overflow-x-hidden font-mono ${!isShellRoute ? 'pt-16' : ''}`}>
  <div className="noise-overlay"></div>
  {!isShellRoute && <NavBar />}
```

---

## 4. Replace the `/app` and `/mode` routes

Find:
```jsx
<Route path="/app" element={<ProtectedRoute><ThemeSelection /></ProtectedRoute>} />
```
and:
```jsx
<Route path="/mode" element={<ProtectedRoute><ModeChoice /></ProtectedRoute>} />
```

Replace both with a single layout route that wraps all shell routes:

```jsx
{/* ── Shell layout — sidebar always present ── */}
<Route
  element={
    <ProtectedRoute>
      <AppShell onStartTest={handleStartTest} />
    </ProtectedRoute>
  }
>
  <Route path="/app"     element={<HomeView />} />
  <Route path="/learn"   element={<LearnMode />} />
  <Route path="/bank"    element={<SavedBlueprints />} />
  <Route path="/profile" element={<ProfileScreen />} />

  <Route
    path="/test/init"
    element={<TestModeInit onStartTest={handleStartTest} />}
  />
  <Route
    path="/test/:id"
    element={
      <SessionRouteHandler
        sessionId={sessionId}
        initialQuestion={initialQuestion}
        initialMessage={initialMessage}
        resumeHistory={resumeHistory}
        initialTurn={initialTurn}
        initialScore={initialScore}
        isRehydrating={isRehydrating}
        onRehydrate={handleRehydrateSession}
        onClearSession={handleClearSession}
      />
    }
  />
</Route>
```

**Remove** the old standalone routes for `/learn`, `/bank`, `/profile`,
`/test/init`, and `/test/:id` — they're now inside the layout route above.

---

## 5. Keep the conflict routes unchanged (for now)

```jsx
{/* These stay exactly as they are */}
<Route path="/conflicts/:themeId" element={<ProtectedRoute><ConflictSelection /></ProtectedRoute>} />
<Route path="/conflict/:conflictId/read" element={<ProtectedRoute><ConflictReading /></ProtectedRoute>} />
```

---

## 6. ChatInterface — remove the top "Socra |" bar

The `ChatInterface.jsx` has its own top bar with "Socra | question" and
the score widget. This stays for now — it works fine inside the shell
since the sidebar is collapsed during sessions.

Optional future improvement: move the score arc into the collapsed sidebar
rail so the top bar can be simplified.

---

## Full route tree after changes

```
/                           → LandingScreen (no shell)
/login                      → LoginScreen  (no shell)

[AppShell layout — sidebar visible]
  /app                      → HomeView
  /learn                    → LearnMode
  /bank                     → SavedBlueprints
  /profile                  → ProfileScreen
  /test/init                → TestModeInit
  /test/:id                 → SessionRouteHandler → ChatInterface

[No shell]
/conflicts/:themeId         → ConflictSelection
/conflict/:conflictId/read  → ConflictReading
```

---

## Files to delete after QA

```
src/components/ThemeSelection.jsx
src/components/ModeChoice.jsx
```
