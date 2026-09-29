import { PLAYERS, LOGO_PRESETS, FRANCHISES, POOL_SIZE_BY_TEAMS } from '../data.js';

const check = (ok, message) => { if (!ok) throw new Error(message); };
check(PLAYERS.length >= 235, `Need at least 235 players; found ${PLAYERS.length}`);
check(FRANCHISES.length === 10, `Expected 10 franchise presets; found ${FRANCHISES.length}`);
check(LOGO_PRESETS.length === 30, `Expected 30 custom crests; found ${LOGO_PRESETS.length}`);
check(new Set(PLAYERS.map(p => p.id)).size === PLAYERS.length, 'Duplicate player IDs detected');
check(new Set(PLAYERS.map(p => p.name)).size === PLAYERS.length, 'Duplicate player names detected');
for (const [teams, pool] of Object.entries(POOL_SIZE_BY_TEAMS)) {
  check(pool >= Number(teams) * 20, `${teams}-team pool cannot fill 20-player squads`);
  check(pool <= PLAYERS.length, `${teams}-team pool exceeds player catalogue`);
}
const roleCounts = PLAYERS.reduce((m,p)=>((m[p.role]=(m[p.role]||0)+1),m),{});
for (const role of ['BAT','WK','AR','BOWL']) check((roleCounts[role]||0)>10, `Insufficient ${role} depth`);
const overseas = PLAYERS.filter(p=>p.overseas).length;
check(overseas >= 70, `Insufficient overseas-player depth: ${overseas}`);
console.log('HammerXI verification PASS');
console.log({ players: PLAYERS.length, overseas, roles: roleCounts, logos: LOGO_PRESETS.length, pools: POOL_SIZE_BY_TEAMS });
