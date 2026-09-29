import { readFile } from 'node:fs/promises';
import { FRANCHISES, LOGO_PRESETS, PLAYERS, POOL_SIZE_BY_TEAMS, ROLE_LABEL } from '../data.js';

const ok = (condition, message) => { if (!condition) throw new Error(message); };
const eq = (actual, expected, message) => ok(Object.is(actual, expected), `${message}: expected ${expected}, got ${actual}`);

const root = { innerHTML: '' };
const toastRoot = { appendChild() {}, innerHTML: '' };
globalThis.document = {
  activeElement: null,
  querySelector(selector) {
    if (selector === '#app') return root;
    if (selector === '#toast-root') return toastRoot;
    return null;
  },
  addEventListener() {},
  createElement() {
    return {
      style: {}, dataset: {}, classList: { add(){}, remove(){}, toggle(){} },
      appendChild(){}, remove(){}, click(){}, setAttribute(){},
      getContext(){ return null; }
    };
  }
};
globalThis.window = { addEventListener(){}, AudioContext: undefined, webkitAudioContext: undefined };
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText(){} } }, configurable: true });
globalThis.location = { host: 'qa.hammerxi.test' };

let source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
source = source
  .replace(/^import .*?from '\.\/data\.js';\s*$/m, '')
  .replace(/^import .*?from 'trystero';\s*$/m, '')
  .replace(/\nrender\(\);\s*$/, '');

const factory = new Function(
  'FRANCHISES','LOGO_PRESETS','PLAYERS','POOL_SIZE_BY_TEAMS','ROLE_LABEL','joinPeerRoom','peerSelfId',
  `${source}
  return {
    app, buildPool, buildQueue, startAuction, togglePause, passLot, placeBid, canTeamBid,
    finishAuction, ensurePostAuction, openTradeWindow, startXiBuilder, proposeTrade, respondTrade,
    autoPickXi, validateXi, xiTargetSize, lockXi, autoFillAllXi, revealResults,
    renderPostAuction, renderTradeWindow, renderXiBuilder, renderResults,
    applySetting, handleCommand
  };`
);

const engine = factory(
  FRANCHISES, LOGO_PRESETS, PLAYERS, POOL_SIZE_BY_TEAMS, ROLE_LABEL,
  () => { throw new Error('Realtime transport should not be invoked by engine regression tests'); },
  'host'
);
const {
  app, buildPool, buildQueue, startAuction, togglePause, passLot, placeBid, canTeamBid,
  finishAuction, ensurePostAuction, openTradeWindow, startXiBuilder, proposeTrade, respondTrade,
  autoPickXi, validateXi, xiTargetSize, lockXi, autoFillAllXi, revealResults,
  renderPostAuction, renderTradeWindow, renderXiBuilder, renderResults,
  applySetting, handleCommand
} = engine;

const sent = [];
app.network = {
  selfId: 'host',
  send(type, payload, target) { sent.push({ type, payload, target }); }
};
app.networkStatus = 'online';

const makeTeam = (id, peer, name, templateIndex) => ({
  id, ownerPeerId: peer, ownerName: name + ' owner', name,
  colors: FRANCHISES[templateIndex].colors, mark: FRANCHISES[templateIndex].mark,
  kind: 'franchise', templateId: FRANCHISES[templateIndex].id,
  budget: 125, players: [], connected: true
});
const hostTeam = makeTeam('t1','host','Alpha XI',0);
const peerTeam = makeTeam('t2','peer2','Beta XI',1);
app.game = {
  version: 2, roomCode: 'QA2V2X', hostPeerId: 'host', phase: 'lobby',
  settings: { maxTeams: 2, squadSize: 18, purse: 125, timerSeconds: 12, overseasLimit: 7, hallOfFame: false },
  teams: [hostTeam, peerTeam], activity: [], auction: null
};
app.route = 'lobby';

// Host-only lobby settings, including optional Hall of Fame.
applySetting('peer2',{type:'setting',key:'hallOfFame',value:1});
eq(app.game.settings.hallOfFame,false,'Non-host must not change Hall of Fame');
applySetting('host',{type:'setting',key:'hallOfFame',value:1});
eq(app.game.settings.hallOfFame,true,'Host can enable Hall of Fame');
applySetting('host',{type:'setting',key:'hallOfFame',value:0});
eq(app.game.settings.hallOfFame,false,'Host can disable Hall of Fame');

// Sequenced auction queue: marquee first, then contiguous role/sub-role groups.
const pool = buildPool(10,'qa-sequence');
const queue = buildQueue(pool,'qa-sequence');
eq(queue.length,pool.length,'Queue must include every pool player exactly once');
eq(new Set(queue.map(x=>x.playerId)).size,queue.length,'Queue cannot contain duplicate players');
ok(queue.slice(0,12).every(x=>x.category==='Marquee'),'First 12 lots must be Marquee');
const order = ['Wicketkeepers','Batters','All-Rounders','Spin Bowlers','Pace Bowlers'];
let last = -1;
for (const lot of queue.slice(12)) {
  const pos = order.indexOf(lot.category);
  ok(pos >= 0,`Unknown auction category: ${lot.category}`);
  ok(pos >= last,`Auction category moved backwards at ${lot.setLabel}`);
  last = pos;
}
for (const category of order) ok(queue.some(x=>x.category===category),`Missing sequence category: ${category}`);

// Non-host cannot start.
startAuction('peer2');
eq(app.game.phase,'lobby','Non-host must not start auction');

// Host starts and engine state initializes.
startAuction('host');
eq(app.game.phase,'auction','Host start must enter auction phase');
ok(app.game.auction.queue.length>0,'Auction queue must be populated');
eq(app.game.auction.status,'live','First lot must be live');

// Pause/continue freezes remaining clock instead of restarting a full clock.
const originalDeadline=app.game.auction.deadline;
togglePause();
eq(app.game.auction.paused,true,'Pause should freeze auction');
ok(app.game.auction.pauseRemaining>0 && app.game.auction.pauseRemaining<=app.game.settings.timerSeconds*1000,'Pause remaining time must be valid');
const frozenRemaining=app.game.auction.pauseRemaining;
togglePause();
eq(app.game.auction.paused,false,'Continue should resume auction');
ok(app.game.auction.deadline-Date.now()<=frozenRemaining+150,'Continue must resume roughly from frozen time');
ok(app.game.auction.deadline>Date.now(),'Continued deadline must be in the future');

// PASS is reversible and never changes timer.
const liveTeam=app.game.teams[0];
const passDeadline=app.game.auction.deadline;
passLot('host',liveTeam);
ok(app.game.auction.passedTeamIds.includes(liveTeam.id),'PASS must mark team passed');
eq(app.game.auction.deadline,passDeadline,'PASS must not change deadline');
passLot('host',liveTeam);
ok(!app.game.auction.passedTeamIds.includes(liveTeam.id),'UNDO PASS must re-enter team');
eq(app.game.auction.deadline,passDeadline,'UNDO PASS must not change deadline');

// Accepted bid updates leader and extends deadline.
const beforeBidDeadline=app.game.auction.deadline;
placeBid('host',liveTeam);
eq(app.game.auction.highestTeamId,liveTeam.id,'Accepted bid must set highest team');
ok(app.game.auction.deadline>=beforeBidDeadline,'Accepted bid must not shorten deadline');
const player = PLAYERS.find(p=>p.id===app.game.auction.queue[app.game.auction.index].playerId);
const [canLeadAgain] = canTeamBid(liveTeam,player,app.game.auction.currentBid,app.game);
eq(canLeadAgain,false,'Current leader cannot bid against itself');

// Host-only pause through command path.
const pausedBefore=app.game.auction.paused;
handleCommand('peer2',{type:'pause'});
eq(app.game.auction.paused,pausedBefore,'Non-host pause command must be ignored');

// Post-auction route must not jump directly to results.
clearInterval(app.hostClock); clearInterval(app.timerClock); clearTimeout(app.advanceTimer);
app.hostClock=app.timerClock=app.advanceTimer=null;
finishAuction();
eq(app.game.phase,'postAuction','Auction must enter post-auction choice stage');
ok(renderPostAuction().includes('Open trade window'),'Post-auction screen must offer trade window');
ok(renderPostAuction().includes('Skip trades'),'Post-auction screen must let host skip trades');

// Non-host cannot open trades; host can.
handleCommand('peer2',{type:'open-trades'});
eq(app.game.phase,'postAuction','Non-host must not open trade stage');
openTradeWindow();
eq(app.game.phase,'trades','Host trade action must enter trade stage');
ok(renderTradeWindow().includes('Send trade offer'),'Trade screen must render offer control');

// Prepare deterministic domestic squads and verify accepted 1-for-1 trade.
const domestic=PLAYERS.filter(p=>!p.overseas);
ok(domestic.length>=30,'Need domestic players for regression fixtures');
hostTeam.players=domestic.slice(0,12).map((p,i)=>({playerId:p.id,price:1+i*.05}));
peerTeam.players=domestic.slice(12,24).map((p,i)=>({playerId:p.id,price:1+i*.05}));
ensurePostAuction(app.game);
const offered=hostTeam.players[0].playerId;
const wanted=peerTeam.players[0].playerId;
proposeTrade(hostTeam,{toTeamId:peerTeam.id,offerPlayerId:offered,targetPlayerId:wanted});
const proposal=app.game.postAuction.tradeProposals.at(-1);
ok(proposal && proposal.status==='pending','Trade proposal must be pending');
respondTrade(peerTeam,{tradeId:proposal.id,accept:true});
eq(proposal.status,'accepted','Receiver must be able to accept trade');
eq(app.game.postAuction.tradesCompleted,1,'Accepted trade increments completed count');
ok(hostTeam.players.some(x=>x.playerId===wanted),'Accepted trade must move requested player');
ok(peerTeam.players.some(x=>x.playerId===offered),'Accepted trade must move offered player');

// Overseas-cap validation must block an illegal trade.
const foreign=PLAYERS.filter(p=>p.overseas);
app.game.settings.overseasLimit=1;
hostTeam.players=[{playerId:domestic[25].id,price:1},{playerId:foreign[0].id,price:1}];
peerTeam.players=[{playerId:foreign[1].id,price:1},{playerId:domestic[26].id,price:1}];
app.game.postAuction.tradeProposals=[];
const domesticOffer=hostTeam.players[0].playerId, foreignTarget=peerTeam.players[0].playerId;
proposeTrade(hostTeam,{toTeamId:peerTeam.id,offerPlayerId:domesticOffer,targetPlayerId:foreignTarget});
const illegal=app.game.postAuction.tradeProposals.at(-1);
respondTrade(peerTeam,{tradeId:illegal.id,accept:true});
eq(illegal.status,'blocked','Trade exceeding overseas cap must be blocked');
ok(hostTeam.players.some(x=>x.playerId===domesticOffer),'Blocked trade must preserve original ownership');
app.game.settings.overseasLimit=7;

// Playing XI stage, auto-pick, legal XI validation, captain and wicketkeeper selection.
hostTeam.players=domestic.slice(0,12).map((p,i)=>({playerId:p.id,price:1+i*.05}));
peerTeam.players=domestic.slice(12,24).map((p,i)=>({playerId:p.id,price:1+i*.05}));
startXiBuilder();
eq(app.game.phase,'xi','Post-trade flow must enter XI builder');
ok(renderXiBuilder().includes('PLAYING XI BUILDER'),'XI builder must render');
for (const t of app.game.teams) {
  autoPickXi(t);
  eq(t.xi.playerIds.length,xiTargetSize(t),`${t.name} auto-pick must fill legal XI size`);
  const [valid,why]=validateXi(t);
  ok(valid,`${t.name} auto-picked XI invalid: ${why}`);
  lockXi(t);
  eq(t.xi.locked,true,`${t.name} XI must lock`);
}

// Host reveal only after every team is locked.
revealResults();
eq(app.game.phase,'results','Locked XIs must reveal results');
const results=renderResults();
ok(results.includes('THE AUCTION DAILY'),'Results must include automatic newspaper');
ok(results.includes('PLAYING XI'),'Results must include Playing XI');
ok(results.includes('data-hof="0"'),'Hall of Fame disabled state must propagate to results');

// Short/imbalanced squad must never deadlock XI stage.
app.game.phase='xi'; app.route='xi';
hostTeam.xi={playerIds:[],captainId:null,wicketkeeperId:null,locked:false};
hostTeam.players=[
  {playerId:domestic[28].id,price:1},
  {playerId:foreign[2].id,price:1},
  {playerId:foreign[3].id,price:1},
  {playerId:foreign[4].id,price:1},
  {playerId:foreign[5].id,price:1},
  {playerId:foreign[6].id,price:1}
];
autoPickXi(hostTeam);
eq(hostTeam.xi.playerIds.length,xiTargetSize(hostTeam),'Incomplete squad auto-pick must fill largest legal lineup');
const [shortValid,shortWhy]=validateXi(hostTeam);
ok(shortValid,`Incomplete squad legal lineup must validate: ${shortWhy}`);

clearInterval(app.hostClock); clearInterval(app.timerClock); clearTimeout(app.advanceTimer);
console.log('HammerXI V2 regression PASS');
console.log({
  sequenceLots: queue.length,
  tradeAccepted: app.game.postAuction.tradesCompleted,
  xiTarget: xiTargetSize(hostTeam),
  resultsNewspaper: true
});
