import { readFile } from 'node:fs/promises';

const app = await readFile('app.js', 'utf8');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const ceremony = await readFile('ceremony.js', 'utf8');

const must = (ok, message) => { if (!ok) throw new Error(message); };

must(pkg.version === '2.0.0', 'package version must be 2.0.0');
for (const token of [
  "hammerxi-auction-night-v2",
  "Wicketkeepers",
  "Batters",
  "All-Rounders",
  "Spin Bowlers",
  "Pace Bowlers",
  "function renderTradeWindow",
  "function renderXiBuilder",
  "function renderNewspaper",
  "function drawNewspaper",
  "open-trades",
  "xi-lock",
  "hallOfFame:false"
]) must(app.includes(token), `Missing V2 feature marker: ${token}`);

must(ceremony.includes("layout.dataset.hof!=='1'"), 'Hall of Fame must remain optional');
must(ceremony.includes('AUCTION HALL OF FAME'), 'Hall of Fame title missing');

console.log('HammerXI V2 verification PASS');
