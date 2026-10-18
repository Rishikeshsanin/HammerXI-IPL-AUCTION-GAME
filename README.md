# HammerXI V2.2.1

A private, browser-to-browser cricket auction game for 2–10 friends.

## Product promise
Professional cricket-auction energy without accounts, permanent profiles, or a fake-official IPL skin.

## Principles
- No account system.
- No database for user profiles or auction history.
- Live room state exists only in connected browsers.
- Encrypted peer-to-peer room transport via Trystero/WebRTC.
- Current auction lots can show free-license player portraits resolved from Wikimedia, with an initials fallback.
- PASS is reversible while the lot is live and never stops the clock.
- Results can be exported as a social-ready PNG locally in the browser.
- Existing IPL franchise names are offered as fan-game presets with original generic badges; no official logos are bundled.

## Local run
Because the app uses ES modules, serve the folder over HTTP:

```bash
python -m http.server 4173
```

Open http://localhost:4173

## Deployment
This is a static Vercel deployment. The production build uses esbuild to bundle the browser app and Trystero runtime into `dist/` before deployment.

## Game defaults
- 2–10 teams
- ₹125 Cr purse
- 15–20 player squads (18 default)
- 6–7 overseas squad slots depending on squad size
- 12-second live bid clock
- 2026-inspired reserve-price ladder with HammerXI incremental bids
- Unsold + recall rounds
- Player pool automatically scales from 50 to 235 based on room size

## Privacy
HammerXI does not intentionally persist player names, team names, room state or auction results. Refreshing/leaving clears the local in-memory state. P2P matchmaking metadata is handled by the selected Trystero discovery strategy; auction payloads are sent peer-to-peer and encrypted by WebRTC.

## Disclaimer
Unofficial fan-made cricket auction game. Not affiliated with or endorsed by BCCI, IPL, or any franchise.


## V2 game flow

HammerXI V2 turns the auction into a complete one-session franchise night:

1. **Sequenced auction sets** — Marquee, Wicketkeepers, Batters, All-Rounders, Spin Bowlers, Pace Bowlers.
2. **Host pause / continue** — the auction clock freezes and resumes from the remaining time.
3. **Optional Trade Window** — host can open it after the auction or skip it immediately. V2 uses owner-approved one-player-for-one-player swaps.
4. **Playing XI Builder** — each owner locks an XI of 11 with at most 4 overseas players, a captain and a wicketkeeper. Auto-pick is available for speed.
5. **Auction Newspaper** — a locally generated post-auction front page plus downloadable poster.
6. **Optional Hall of Fame** — controlled by the host from the lobby; when disabled the awards ceremony is omitted.

All V2 room state remains ephemeral and browser-to-browser. HammerXI still has no account database or permanent auction history.


## Direct invite links

The lobby's **Copy invite link** button copies a full HammerXI URL containing the live room code. Opening that link takes a friend directly to the Join Auction screen with the room code prefilled; they only need to choose their owner/team identity and join.


## Fast bids and rollback

Live auctions include normal increment bidding plus **+₹50L** and **+₹1 Cr** quick-bid controls. Quick bids still pass through all normal purse, squad, overseas and PASS-state validation.

The host also has a conservative **Previous player** control. It is available only on a fresh current lot before any accepted bid. If the previous player was sold, HammerXI refunds the winning franchise, removes the purchase and reopens that player cleanly.


## V2.1 — Private Squad Intelligence

V2.1 upgrades the live auction owner's **MY SQUAD** area without exposing strategy to the room:

- Players are grouped into Wicketkeepers, Batters, All-Rounders and Bowlers.
- Each row shows player name, overseas status and auction price without cluttering the panel with ratings.
- The latest purchase receives a short arrival highlight while the SOLD result is on screen.
- **LIVE SQUAD NEEDS** is rendered only for the local franchise owner and is never shown on the public Broadcast screen.
- Private guidance includes role deficits, remaining squad slots, remaining overseas capacity and the ₹30L-per-open-slot completion floor.
- The panel is collapsible and remains available on mobile even though the full left auction sidebar is hidden there.

The role targets are HammerXI balance guidance, not mandatory auction rules. Core purse protection and squad restrictions remain unchanged.


## V2.1.1 — Player photo reliability

Player photos remain exact-match Wikimedia/Wikipedia assets with initials as the safe fallback. V2.1.1 improves cross-screen reliability by letting the current host share the resolved Wikimedia photo metadata with connected guests, while guests retain their own exact-page retry fallback if that message is missed. Transient Wikipedia API failures are no longer cached as permanent "no photo" results.


## V2.2 — Realtime and mobile hardening

V2.2 focuses on auction-night reliability rather than adding game rules.

- Rapid **bid / PASS / pause / chat / reaction** traffic uses compact host-authoritative delta packets instead of repeatedly sending the complete room snapshot.
- Full canonical snapshots remain the recovery path for joins, reconnects, lot transitions, SOLD/UNSOLD resolution and explicit resynchronization.
- Incoming UI updates are coalesced through the browser animation frame so bursts of realtime messages do not trigger redundant full renders.
- Chat draft text and focus survive authoritative auction rerenders.
- The visual countdown refresh interval is reduced to a lower-overhead cadence while host deadline authority remains unchanged.
- CI includes a deterministic 10-team / 20-player-per-squad / 235-lot stress model and enforces hot-path payload size limits.
- CI also enforces production asset-size budgets and mobile responsiveness guards.
- Mobile inputs use a 16px floor to prevent iOS focus zoom, auction controls keep touch-friendly targets, and an additional narrow-phone layout protects widths at 360px and below.

These changes do not alter bidding rules, squad rules, privacy behavior or the host-authoritative game model.

## V2.2.1 — Browser Endurance QA

V2.2.1 turns the maximum-room playtest into repeatable CI instead of relying only on manual testing.

- Playwright opens a real **10-tab HammerXI room** using the deterministic same-browser fallback transport.
- All 10 franchises join through the actual Host/Join UI and the auction starts through the real controls.
- The suite exercises rapid alternating bids, +₹50L / +₹1 Cr shortcuts, PASS / UNDO PASS, pause / resume, chat, SOLD, private squad updates and Previous Player rollback.
- Auction state must converge across all 10 clients after burst traffic.
- The browser matrix covers **320, 360, 375, 390, 412, 430, 768, 1024, 1280 and 1440px** layouts.
- Compact-phone tests reject horizontal overflow and verify auction controls stay inside the viewport with touch-friendly heights.
- A Trystero adapter contract test locks the pinned 0.25.4 integration assumptions: room creation, action send/receive callbacks, peer callbacks, targeted sends and room leave.
- Guest BID/PASS commands now wait for host acknowledgement before accepting another BID/PASS tap, preventing accidental double-submit behavior on slow links.
- Browser QA found and fixed a real <=320px home-page overflow caused by a later desktop theme rule restoring the two-column hero layout.

The browser suite is deterministic and does not claim to emulate every carrier/NAT/router combination; live WebRTC still uses the same host-authoritative model in production.
