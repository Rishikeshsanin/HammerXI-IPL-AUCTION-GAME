# HammerXI Architecture

## Production shape
- Static HTML/CSS/ES modules served by Vercel.
- No app database and no user-auth service.
- Multiplayer: Trystero 0.25+ loaded only when a room is created/joined; default Nostr signalling establishes encrypted WebRTC peer connections.
- Host-authoritative state machine validates every accepted bid, purse constraint, pass, squad limit, timer resolution and sale.
- Guests send commands; the host sends canonical snapshots.
- Host disconnect: connected peers deterministically elect a replacement host.
- Local fallback: BroadcastChannel, only for same-browser/offline testing.

## Performance
- No frontend framework runtime.
- No animation library.
- No external font dependency.
- CSS transitions honor `prefers-reduced-motion`.
- Player catalogue ships as a small local JS data module.
- Story-card and CSV export run in the browser.
