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
  createElement(tag='div') {
    const gradient={ addColorStop(){} };
    const ctx={
      fillStyle:'',font:'',textAlign:'left',
      fillRect(){},fillText(){},save(){},restore(){},translate(){},
      beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},rect(){},roundRect(){},
      createLinearGradient(){return gradient},createRadialGradient(){return gradient},
      measureText(text){return {width:String(text).length*12}}
    };
    return {
      tagName:String(tag).toUpperCase(), style: {}, dataset: {}, className:'', innerHTML:'',
      classList: { add(){}, remove(){}, toggle(){} },
      appendChild(){}, remove(){}, click(){}, setAttribute(){},
      getContext(){ return ctx; },
      toBlob(cb){ cb(new Blob(['hammerxi-qa'],{type:'image/png'})); }
    };
  }
};
globalThis.window = { addEventListener(){}, AudioContext: undefined, webkitAudioContext: undefined };
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText(){} } }, configurable: true });
globalThis.location = { host: 'qa.hammerxi.test', href: 'https://qa.hammerxi.test/', search: '', hash: '', pathname: '/' };

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
    updateBiddingWar, resolveSold, resolveUnsold, advancePlayer, finishAuction,
    ensurePostAuction, openTradeWindow, startXiBuilder, proposeTrade, respondTrade,
    autoPickXi, validateXi, xiTargetSize, lockXi, autoFillAllXi, revealResults,
    renderPostAuction, renderTradeWindow, renderXiBuilder, renderResults, renderBroadcastAuction, drawNewspaper,
    applySetting, handleCommand, handleJoin, receiveNetwork, onPeerLeave, inviteUrl, applyInviteDeepLink, inviteUrl, applyInviteDeepLink
  };`
);

const engine = factory(
  FRANCHISES, LOGO_PRESETS, PLAYERS, POOL_SIZE_BY_TEAMS, ROLE_LABEL,
  () => { throw new Error('Realtime transport should not be invoked by engine regression tests'); },
  'host'
);
const {
  app, buildPool, buildQueue, startAuction, togglePause, passLot, placeBid, canTeamBid,
  updateBiddingWar, resolveSold, resolveUnsold, advancePlayer, finishAuction,
  ensurePostAuction, openTradeWindow, startXiBuilder, proposeTrade, respondTrade,
  autoPickXi, validateXi, xiTargetSize, lockXi, autoFillAllXi, revealResults,
  renderPostAuction, renderTradeWindow, renderXiBuilder, renderResults, renderBroadcastAuction, drawNewspaper,
  applySetting, handleCommand, handleJoin, receiveNetwork, onPeerLeave
} = engine;

const sent = [];
app.network = {
  selfId: 'host',
  send(type, payload, target) { sent.push({ type, payload, target }); }
};
app.networkStatus = 'online';

// Direct invite links must carry the room code and open the prefilled join flow.
const direct=inviteUrl('ABC234');
ok(direct.includes('room=ABC234'),'Invite URL must contain room query parameter');
globalThis.location={host:'qa.hammerxi.test',href:'https://qa.hammerxi.test/?room=ABC234',search:'?room=ABC234',hash:'',pathname:'/'};
app.route='home';app.draft.joinCode='';
ok(applyInviteDeepLink(),'Valid invite deep link must be recognized');
eq(app.route,'join','Invite deep link must open Join screen');
eq(app.draft.joinCode,'ABC234','Invite deep link must prefill room code');
globalThis.location={host:'qa.hammerxi.test',href:'https://qa.hammerxi.test/',search:'',hash:'',pathname:'/'};

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

// A genuine alternating two-team sequence must activate BIDDING WAR.
for (let i=0;i<4;i++) {
  const bidder = i%2===0 ? peerTeam : liveTeam;
  placeBid(bidder.ownerPeerId,bidder);
}
ok(app.game.auction.war?.active===true,'Five alternating accepted bids must activate BIDDING WAR');
ok(renderBroadcastAuction().includes('BIDDING WAR'),'Broadcast mode must surface active bidding war');

// SOLD must charge the winner, add the player exactly once and record war win.
const winner=app.game.teams.find(t=>t.id===app.game.auction.highestTeamId);
const winnerBudget=winner.budget,winnerCount=winner.players.length,currentPrice=app.game.auction.currentBid;
resolveSold();
eq(app.game.auction.status,'sold','Resolved lot must become sold');
eq(winner.players.length,winnerCount+1,'SOLD must add player to winner exactly once');
eq(winner.budget,Math.round((winnerBudget-currentPrice+Number.EPSILON)*100)/100,'SOLD must deduct final price');
ok(app.game.auction.sold.at(-1)?.war===true,'SOLD record must preserve bidding-war flag');
clearTimeout(app.advanceTimer); app.advanceTimer=null;

// Host-only pause through command path.
const pausedBefore=app.game.auction.paused;
handleCommand('peer2',{type:'pause'});
eq(app.game.auction.paused,pausedBefore,'Non-host pause command must be ignored');

// UNSOLD final lot must enter accelerated recall when squads still have room.
const recallPlayer=PLAYERS.find(p=>!winner.players.some(x=>x.playerId===p.id));
app.game.auction.queue=[{playerId:recallPlayer.id,setLabel:'QA Final Lot',category:'Batters'}];
app.game.auction.index=0;app.game.auction.round=1;app.game.auction.unsold=[];app.game.auction.status='live';app.game.auction.highestTeamId=null;app.game.auction.passedTeamIds=[];
resolveUnsold();
eq(app.game.auction.status,'unsold','No-bid lot must resolve UNSOLD');
ok(app.game.auction.unsold.includes(recallPlayer.id),'Round-one unsold player must enter recall list');
clearTimeout(app.advanceTimer);app.advanceTimer=null;
advancePlayer();
eq(app.game.auction.round,2,'End of first round with unsold players must start recall');
eq(app.game.auction.queue[0].setLabel,'Accelerated Recall','Recall queue must be labelled clearly');

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
drawNewspaper();

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

// Room join validation and snapshot phase synchronization.
app.game={
  version:2,roomCode:'JOINV2',hostPeerId:'host',phase:'lobby',
  settings:{maxTeams:3,squadSize:18,purse:125,timerSeconds:12,overseasLimit:7,hallOfFame:false},
  teams:[makeTeam('j1','host','Join Host',0)],activity:[],auction:null
};
app.route='lobby';app.network.selfId='host';sent.length=0;
handleJoin('join-peer',{ownerName:'Guest',name:'Join Guest',colors:['#111','#222'],mark:'JG',kind:'custom',templateId:'custom:qa'});
eq(app.game.teams.length,2,'Valid join must add one franchise');
ok(sent.some(x=>x.type==='ack'&&x.target==='join-peer'&&x.payload.accepted),'Host must ACK valid join');
handleJoin('duplicate-peer',{ownerName:'Other',name:'Join Guest',colors:['#111','#222'],mark:'JG',kind:'custom',templateId:'custom:qb'});
eq(app.game.teams.length,2,'Duplicate franchise name must be rejected');

// Snapshot must move clients across V2 phases.
app.network.selfId='join-peer';app.game.teams[1].ownerPeerId='join-peer';
const snap=structuredClone(app.game);snap.phase='trades';snap.postAuction={tradeProposals:[],tradesCompleted:0};
receiveNetwork({type:'snapshot',payload:snap},'host');
eq(app.route,'trades','Snapshot must synchronize client route to trade stage');

// Host migration must promote a connected remaining peer.
app.game.hostPeerId='host';app.game.teams[0].connected=true;app.game.teams[1].connected=true;
onPeerLeave('host');
eq(app.game.hostPeerId,'join-peer','Host disconnect must migrate control to a connected peer');
ok(app.game.teams[0].connected===false,'Disconnected host team must be marked offline');

clearInterval(app.hostClock); clearInterval(app.timerClock); clearTimeout(app.advanceTimer);
console.log('HammerXI V2 regression PASS');
console.log({
  sequenceLots: queue.length,
  tradeAccepted: app.game.postAuction.tradesCompleted,
  xiTarget: xiTargetSize(hostTeam),
  resultsNewspaper: true
});
