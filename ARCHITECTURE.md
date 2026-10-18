# HammerXI Architecture

## Production shape
- Static HTML/CSS/ES modules served by Vercel.
- No app database and no user-auth service.
- Multiplayer: Trystero 0.25+ loaded only when a room is created/joined; default Nostr signalling establishes encrypted WebRTC peer connections.
- Host-authoritative state machine validates every accepted bid, purse constraint, pass, squad limit, timer resolution and sale.
- Guests send commands; the host remains canonical. High-frequency auction updates use compact host-authoritative deltas, while full snapshots are used for joins, reconnects, structural transitions and resynchronization.
- Host disconnect: connected peers deterministically elect a replacement host.
- Local fallback: BroadcastChannel, only for same-browser/offline testing.

## Performance
- Rapid auction deltas avoid repeatedly transmitting the full 10-team room state during bidding.
- Full-state resync remains available when a client detects a lot/index mismatch.
- Realtime render requests are coalesced to one browser animation frame.
- CI stress-tests the maximum 10-team, 20-player-per-team scenario and applies static bundle budgets.
- Mobile CI guards preserve responsive breakpoints, touch-target sizing and iOS-safe form sizing.
- No frontend framework runtime.
- No animation library.
- No external font dependency.
- CSS transitions honor `prefers-reduced-motion`.
- Player catalogue ships as a small local JS data module.
- Story-card and CSV export run in the browser.

## Browser endurance QA
- CI builds the same `dist/` assets used by production and serves them through a local HTTP server.
- Playwright runs a 10-tab room through HammerXI's BroadcastChannel fallback. This isolates application/state/UI correctness from public signalling availability while still exercising real browser events and cross-tab messages.
- A separate Trystero contract test verifies the production transport adapter against the pinned API shape.
- Guest BID/PASS UI uses an acknowledgement lock: one command can be in flight until a host delta/snapshot/notice clears it, with a short timeout as a recovery guard.
- Mobile browser QA enforces no horizontal overflow across 320–430px widths and keeps 16px form controls / touch-sized auction actions.
