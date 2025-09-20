## Quick context

- Repo: minimal React + Vite app with a feature folder `maSTAR/` under the project root.
- App entry: `maSTAR/src/main.jsx` -> `maSTAR/src/App.jsx`.
- A small assistant/call integration lives in `maSTAR/src/ai.js` and `maSTAR/src/call/*`.
- Dev commands: `npm install` then `npm run dev` (Vite). Build: `npm run build`. Lint: `npm run lint`.

## What an AI coding agent should know (concrete, codebase-specific)

- Environment variables: `VITE_VAPI_API_KEY` and `VITE_ASSISTANT_ID` are required by `maSTAR/src/ai.js` which instantiates `@vapi-ai/web` (see `vapi = new Vapi(import.meta.env.VITE_VAPI_API_KEY)`). Don't hardcode keys; use `import.meta.env`.

- Call lifecycle: `maSTAR/src/App.jsx` is the orchestrator. Important flows:
  - `handleStart()` calls `startAssistant()` from `ai.js`, which returns `{ id }` stored as `callId`.
  - `getCallDetails()` polls `/call-details?call_id=<callId>` until the response contains `analysis` and `summary`.
  - `stopAssistant()` (via `ai.js`) should be followed by `getCallDetails()` to fetch final results.

- Polling and UI-responsiveness: the project currently implements polling with recursive `setTimeout()` inside `getCallDetails()` in `App.jsx`. That is the single most likely cause of long-running or repeated work when `callId` is invalid or the endpoint never returns the expected shape. See `maSTAR/src/App.jsx` lines around `getCallDetails`.

## Known pitfalls discovered in the code (fix first if you want reliable runs)

- Self-import / component duplication in `maSTAR/src/call/*`:
  - `AssistantSpeechIndicator.jsx` currently contains duplicated content and even imports `./AssistantSpeechIndicator` (self-import). This creates a broken circular import and can block module resolution or produce runtime errors. Fix by replacing the file with a real small component that uses the `isSpeaking` prop (example below).

- Polling without guards in `getCallDetails()`:
  - It unconditionally retries until `data.analysis && data.summary` exist. If `callId` is empty or the server never responds with the expected fields, you get continuous retries. Also the code uses `alert(error)` in `.catch()`, which blocks the UI as `alert` is modal.

## Recommended, concrete fixes (apply these edits)

- Replace modal `alert` with `console.error` and expose errors in the UI.

- Guard and abort polling:
  - Do not call `getCallDetails()` when `callId` is falsy.
  - Prefer an async loop with an `AbortController`, a max retry count, and exponential backoff. Example (adapt in `maSTAR/src/App.jsx`):

```js
// Example safe polling (replace existing getCallDetails)
const pollCallDetails = async (callId, { interval = 3000, maxAttempts = 20, signal } = {}) => {
  if (!callId) return null;
  let attempts = 0;
  while (attempts < maxAttempts && !signal?.aborted) {
    attempts++;
    try {
      const res = await fetch(`/call-details?call_id=${callId}`, { signal });
      const data = await res.json();
      if (data.analysis && data.summary) return data;
    } catch (err) {
      console.error('poll error', err);
      break; // or continue based on error type
    }
    // wait
    await new Promise((r) => setTimeout(r, interval));
  }
  return null;
};
```

- Fix `AssistantSpeechIndicator.jsx` to avoid self-import. Minimal example to drop into `maSTAR/src/call/AssistantSpeechIndicator.jsx`:

```jsx
const AssistantSpeechIndicator = ({ isSpeaking }) => (
  <div className={`speech-indicator ${isSpeaking ? 'speaking' : ''}`}>
    {isSpeaking ? 'Assistant speaking…' : 'Idle'}
  </div>
);

export default AssistantSpeechIndicator;
```

## How to reproduce and debug the 'unresponsive' symptom

- Steps:
  1. Run `npm install` then `npm run dev` in the repo root.
  2. Open browser devtools → Console and Network.
  3. Look for repeated network requests to `/call-details` and/or repeated errors in Console.
  4. Use Performance → Record (5–10s) to capture main-thread long tasks if the page becomes unresponsive.

## Files to inspect when working on performance / bugs

- `maSTAR/src/App.jsx` — call orchestration and polling (primary).
- `maSTAR/src/ai.js` — VAPI client instantiation and start/stop wrappers.
- `maSTAR/src/call/*` — UI components; check for incorrect imports or long-running synchronous logic.
- `maSTAR/eslint.config.js` — project lint rules.

## Dev commands (Windows PowerShell)

```powershell
npm install
npm run dev    # start Vite dev server
npm run build  # produce production build
npm run lint   # run ESLint
```

## Final note

Make small, testable changes (fix one component or the polling logic) and verify in the browser before broader refactors. If you want, I can open PR patches for the two high-priority fixes: (1) repair `AssistantSpeechIndicator.jsx` and (2) replace `getCallDetails()` with safe polling using AbortController and guarded retries.
