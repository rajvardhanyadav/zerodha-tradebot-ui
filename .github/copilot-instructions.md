# Project Guidelines

## Architecture

- **React 19 SPA** with Vite 6 — no routing library; page switching via `currentPage` state in `App.tsx`
- **Four pages:** `LoginScreen`, `Dashboard`, `BacktestPage`, `MarketAnalysisPage`
- **Dark theme only** — forced globally via `document.documentElement.classList.add('dark')`
- **No global state management** — React hooks only (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`); auth persisted in localStorage
- **File layout:** `/components` for UI, `/services` for API clients, root for config/types
- **Custom SVG charts** — no charting library; see `BacktestResultView.tsx` for patterns
- **Three services:** `kiteConnect.ts` (core trading), `backtestService.ts` (backtesting), `marketAnalysisService.ts` (neutral market analysis) — each with independent `apiFetch<T>()` wrapper

## Code Style

- **TypeScript** throughout — type all props via interfaces, use enums from `types.ts` for domain constants
- **Tailwind CSS** exclusively — no CSS modules or styled-components
- **Dark palette:** `bg-slate-900/800/700`, `text-slate-200/400`, `text-green-400` (profit), `text-red-400` (loss), `text-kite-blue`/`bg-kite-blue` (brand)
- **Functional components** with `React.FC<Props>` pattern
- **Path alias:** `@/*` maps to repo root (configured in `vite.config.ts` and `tsconfig.json`)

## Build and Test

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

- **No test framework configured** — add Vitest if tests are needed
- **Firebase hosting** deploys from `dist/` — SPA rewrite to `index.html`

## Conventions

### API Client Pattern
- All API calls go through service wrappers in `/services`
- Backend base URL: `http://localhost:8080/api` (hardcoded in `kiteConnect.ts`)
- **Response envelope:** `{ success: boolean, message: string, data: T }` — always unwrap via `success` check
- **Auth headers:** `Authorization: Bearer <jwt>` + `X-User-Id` — added automatically by `kiteConnect.ts`
- **API logging:** `subscribeToApiLogs()` observer pattern streams activity to the Dashboard trade log
- **Content-Type:** Only set on requests with a body (omitting on GET prevents 400 errors)

### Component Conventions
- **Loading states:** Explicit boolean flags (`isLoading`, `isUrlLoading`) with optional progress messages
- **Confirmation dialogs:** Double-click pattern with 5-second timeout for destructive actions
- **Auto-refresh:** Toggleable polling via `setInterval` with configurable frequency
- **Error handling:** Try-catch in async handlers → set error state → display inline

### Backtest API
- See [BACKTEST_FRONTEND_INTEGRATION.md](../BACKTEST_FRONTEND_INTEGRATION.md) for full endpoint reference, types, and async polling patterns
- Exit reason codes: `TARGET_HIT`, `STOPLOSS_HIT`, `PREMIUM_DECAY`, `PREMIUM_EXPANSION`, `TRAILING`, `TIME_BASED_FORCED_EXIT`, `END_OF_DATA`
- Formatting helpers in `backtestService.ts`: `formatCurrency()` (₹), `formatPoints()`, `formatPct()`

### Market Analysis API
- See [MARKET_ANALYSIS_API_SPEC.md](../MARKET_ANALYSIS_API_SPEC.md) for the 3-layer neutral market scoring model (regime, microstructure, veto gates)
- Runs every 30s during market hours (09:15–15:10 IST)
- Types: `NeutralMarketLog`, `NeutralMarketSummary`, `MarketRegime`, `BreakoutRisk` in `types.ts`
- Formatting helpers in `marketAnalysisService.ts`: `formatConfidence()`, `formatScore()`

## Pitfalls

- **No `strict: true`** in tsconfig — `skipLibCheck: true` is on; be careful with external type compatibility
- **localStorage for auth** — tokens are not in HttpOnly cookies; avoid storing sensitive data beyond JWT
- **GEMINI_API_KEY** is exposed to client via Vite env — do not add secrets this way for production
- **Backend URL hardcoded** — swap to `import.meta.env.VITE_API_URL` if multi-environment support is needed
