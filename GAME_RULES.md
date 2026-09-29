# HammerXI V1 Rules

HammerXI is a fast friend-group cricket auction inspired by professional IPL auction mechanics. It is intentionally adapted for 2–10 friends and shorter one-session squads.

## Room
- 2–10 franchises.
- Host chooses capacity, squad size (15–20), purse (₹100/₹125/₹150 Cr), and bid clock (8/10/12/15/20 seconds).
- ₹125 Cr is the default 2026-inspired purse.
- Players may use one of 10 current IPL franchise-name presets with original generic badges, or create a custom franchise using 30 original crest presets.

## Squads
- Overseas cap: 6 for 15–17 player squads; 7 for 18–20 player squads.
- Pool scales by franchises actually present at auction start: 2→50, 3→70, 4→95, 5→115, 6→140, 7→160, 8→185, 9→210, 10→235.
- ₹30L is the minimum purse reserve used by HammerXI's anti-bankruptcy check for each mandatory remaining slot.
- HammerXI intentionally uses 15–20 player squads so a friends auction can finish comfortably in one sitting; this is not the IPL's full squad-size rule.

## Auction
- Reserve tiers: ₹30L, ₹40L, ₹50L, ₹75L, ₹1 Cr, ₹1.25 Cr, ₹1.5 Cr, ₹2 Cr.
- Bid steps: +₹5L below ₹1 Cr; +₹10L from ₹1–2 Cr; +₹20L from ₹2–5 Cr; +₹25L at/above ₹5 Cr.
- First bid is the reserve price.
- Every accepted bid resets the clock to at least five seconds to reduce last-second network-race frustration.
- Passing temporarily removes a franchise from bidding for that player.
- PASS is reversible with UNDO PASS while the lot is still live.
- PASS never pauses, resets, or ends the countdown. Only a new accepted bid resets the bid clock.
- Host may pause/resume or skip a lot. If a highest bid exists, skipping awards that valid highest bid; otherwise the lot is unsold.
- Unsold players receive one accelerated recall round when franchises still need players.

## Authenticity note
The reserve ladder and ₹125 Cr default are inspired by the 2026 IPL auction framework. Player ratings, scaled pools, shorter squad sizes, overseas caps and bid increments are HammerXI gameplay choices built for a fair, fast friends game.


## HammerXI V2 post-auction rules

### Auction sequence
The main player pool is presented in a fixed cricket-role sequence:
**Marquee → Wicketkeepers → Batters → All-Rounders → Spin Bowlers → Pace Bowlers**.
Large categories are split into numbered sets so one role is completed before the next begins.

### Pause / Continue
Only the host can pause the live auction. Pausing freezes the remaining countdown. Continuing resumes from the frozen remaining time; it does not restart a fresh full clock.

### Optional Trade Window
After the auction, the host chooses either **Open Trade Window** or **Skip Trades**.
V2 trades are one-player-for-one-player swaps. The receiving franchise must explicitly accept. A trade is blocked if the resulting squad would exceed the auction overseas-squad limit. The host may end the trade window at any time.

### Playing XI
Each franchise selects exactly 11 players. A Playing XI may contain at most 4 overseas players. A captain must be selected from the XI. If the squad contains specialist wicketkeepers, the XI must contain a wicketkeeper and designate one as keeper.

### Newspaper and Hall of Fame
The Auction Newspaper is generated locally from the room's final auction data. Hall of Fame is an optional host setting; its awards are entertainment based on the current room's auction results, not objective cricket-performance rankings.
