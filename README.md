# HammerXI V2

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
This is a static site and can be deployed directly to Vercel with zero build step.

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
