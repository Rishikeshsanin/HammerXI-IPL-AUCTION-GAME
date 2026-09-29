# HammerXI Privacy Model

HammerXI is intentionally accountless and database-free.

- No signup or login.
- No analytics SDK is bundled.
- No cookies or localStorage are used for user profiles or auction history.
- Owner names, franchise choices, bids, chat and auction state live only in the active browsers.
- Internet multiplayer uses Trystero/WebRTC. Signalling is used to discover peers; auction payloads then travel directly peer-to-peer using WebRTC encryption.
- If peer networking cannot load, the UI explicitly falls back to a same-browser `BroadcastChannel` test transport; this is not advertised as internet multiplayer.
- Results are rendered locally as PNG/CSV downloads. HammerXI does not upload those exports.
- Closing/leaving the room discards HammerXI's in-memory state. The app does not implement server-side auction history.

Like any WebRTC application, network/signalling infrastructure can process ordinary connection metadata needed to establish a peer session. HammerXI does not operate a user database on top of that infrastructure.


## Player photographs
When a player comes up for auction, HammerXI may request a free-license article thumbnail from the public English Wikipedia/MediaWiki API. No HammerXI account or profile data is sent with that request. The browser makes the request directly and HammerXI keeps the resolved image URL only in memory for the current page session. If no suitable image is available, the auction card falls back to the player's initials.
