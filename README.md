# HammerXI

A private, browser-to-browser cricket auction game for 2–10 friends.

## Product promise
Professional cricket-auction energy without accounts, permanent profiles, or a fake-official IPL skin.

## Principles
- No account system.
- No database for user profiles or auction history.
- Live room state exists only in connected browsers.
- Encrypted peer-to-peer room transport via Trystero/WebRTC.
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
