# Socra — Streamlined Flow Handoff
## For Claude Code

---

## What this changes

The current flow has **6 screens before a student types their first thought:**
Landing → Login → ThemeSelection → ConflictSelection → ConflictReading → ModeChoice → Chat

The new flow has **2 steps:**
Login → App Shell (sidebar always visible) → Start session

---

## Architecture: React Router Layout Route

The cleanest approach is a **layout route** using React Router v6's `<Outlet>` pattern.

```
App.jsx routes (new):

<Route path="/" element={<LandingScreen />} />
<Route path="/login" element={<LoginScreen />} />

// All authenticated routes share the AppShell layout
<Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
  <Route path="/app"        element={<HomeView />} />
  <Route path="/learn"      element={<LearnMode />} />
  <Route path="/bank"       element={<SavedBlueprints />} />
  <Route path="/profile"    element={<ProfileScreen />} />
  <Route path="/test/init"  element={<TestModeInit onStartTest={handleStartTest} />} />
  <Route path="/test/:id"   element={<SessionRouteHandler ... />} />
</Route>
```

AppShell renders the sidebar + `<Outlet />`. When a question is selected in the
sidebar, AppShell shows `<QuestionDetail>` in the main area (no route change).
When the user starts a session, it navigates to `/test/:id` (route change),
and AppShell auto-collapses the sidebar.

---

## Files to CREATE (in src/components/)

| File | Replaces |
|------|---------|
| `AppShell.jsx` | NavBar (for authenticated routes) + ThemeSelection layout |
| `Sidebar.jsx` | Half of ThemeSelection + all of ModeChoice |
| `HomeView.jsx` | ThemeSelection (right panel / past year tab) |
| `QuestionDetail.jsx` | ModeChoice |

All 4 files are in this handoff/ folder.

---

## Files to MODIFY

### `src/App.jsx`

1. **Hide NavBar on shell routes.** The sidebar replaces the NavBar for
   authenticated users. Add this to AppRoutes:

```jsx
const shellPaths = ['/app', '/test', '/learn', '/bank', '/profile'];
const isShellRoute = shellPaths.some(p => location.pathname.startsWith(p));

// Then in JSX — conditionally render NavBar:
{!isShellRoute && <NavBar />}
```

2. **Remove the `pt-16` padding** on the root div when in shell routes
   (the NavBar adds 64px padding that won't be needed):

```jsx
<div className={`min-h-screen bg-background text-textDefault relative overflow-x-hidden font-mono ${!isShellRoute ? 'pt-16' : ''}`}>
```

3. **Update routes** — replace the ThemeSelection + ModeChoice routes
   with the layout route pattern above. Keep `/conflict/*` routes for now
   (they're still accessible from the "Browse themes" link in the sidebar).

4. **Keep `handleStartTest`, `handleRehydrateSession`, etc.** — these
   stay in App.jsx and get passed down through the TestModeInit /
   SessionRouteHandler as before. The only thing that changes is HOW
   the user reaches `/test/init` — now via the sidebar instead of
   ThemeSelection → ModeChoice.

### `src/components/NavBar.jsx`

No structural changes needed — just conditionally hide it (see above).
The NavBar remains for the Landing and Login screens.

---

## Files to DELETE (after confirming everything works)

- `src/components/ThemeSelection.jsx`
- `src/components/ModeChoice.jsx`

Keep for now, delete after full QA.

---

## One gotcha: the streak count in Sidebar

`Sidebar.jsx` currently has `const streak = 7` as a placeholder.
Replace this with a fetch from `/api/profile` or derive it from the
sessions data (same logic as `ProfileScreen.jsx`).

The simplest approach: pass `streak` as a prop from AppShell, which
fetches it once on mount:

```jsx
// In AppShell.jsx, add:
const [streak, setStreak] = useState(0);
useEffect(() => {
  fetchWithAuth('http://localhost:8000/api/sessions')
    .then(r => r.json())
    .then(data => {
      // Re-use the streak logic from ProfileScreen.jsx
      const streak = computeStreak(data.sessions || []);
      setStreak(streak);
    });
}, []);
// Then pass streak={streak} to <Sidebar>
```

---

## Keeping the conflict/learn flow

The existing ConflictSelection → ConflictReading → LearnMode flow is NOT
deleted. It stays at `/conflicts/:themeId` etc. The sidebar can link to it
via a "Browse by theme →" link in the future. For now, the sidebar's
"◈ Learn" mode on a question goes directly to `/learn` (the LearnMode
component) with the question passed via location.state, skipping the
conflict reading step. This is fine for the MVP.

---

## Summary of what students experience

Before: 6 taps to start thinking.
After:  Tap a question in the sidebar → tap "Start forming your arguments" → done.

The sidebar is always there. Questions are always one tap away.
The streak is always visible. The blueprint count grows visibly.
"Today's Question" creates a daily shared experience across all users.
