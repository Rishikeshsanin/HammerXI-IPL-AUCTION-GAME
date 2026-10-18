import { readFile } from 'node:fs/promises';
import { FRANCHISES, LOGO_PRESETS, PLAYERS, POOL_SIZE_BY_TEAMS, ROLE_LABEL } from '../data.js';

const ok=(c,m)=>{if(!c)throw new Error(m)};
const eq=(a,b,m)=>ok(Object.is(a,b),`${m}: expected ${b}, got ${a}`);

const root={innerHTML:''},toastRoot={appendChild(){},innerHTML:''};
globalThis.document={
  activeElement:null,
  querySelector(s){if(s==='#app')return root;if(s==='#toast-root')return toastRoot;return null},
  addEventListener(){},
  createElement(tag='div'){
    const gradient={addColorStop(){}};
    const ctx={fillStyle:'',font:'',textAlign:'left',fillRect(){},fillText(){},save(){},restore(){},translate(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},rect(){},roundRect(){},createLinearGradient(){return gradient},createRadialGradient(){return gradient},measureText(t){return {width:String(t).length*12}}};
    return {tagName:String(tag).toUpperCase(),style:{},dataset:{},className:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},appendChild(){},remove(){},click(){},setAttribute(){},getContext(){return ctx},toBlob(cb){cb(new Blob(['qa'],{type:'image/png'}))}};
  }
};
globalThis.window={addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}},AudioContext:undefined,webkitAudioContext:undefined};
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText(){}}},configurable:true});
globalThis.location={host:'qa.hammerxi.test',href:'https://qa.hammerxi.test/',search:'',hash:'',pathname:'/'};

let source=await readFile(new URL('../app.js',import.meta.url),'utf8');
source=source.replace(/^import .*?from '\.\/data\.js';\s*$/m,'').replace(/^import .*?from 'trystero';\s*$/m,'').replace(/\napplyInviteDeepLink\(\);\s*render\(\);\s*$/,'');
const factory=new Function('FRANCHISES','LOGO_PRESETS','PLAYERS','POOL_SIZE_BY_TEAMS','ROLE_LABEL','joinPeerRoom','peerSelfId',`${source}
return {app,ensurePostAuction,openTradeWindow,startXiBuilder,proposeTrade,respondTrade,autoPickXi,validateXi,xiTargetSize,lockXi,revealResults,renderResults,overseasCount};`);
const engine=factory(FRANCHISES,LOGO_PRESETS,PLAYERS,POOL_SIZE_BY_TEAMS,ROLE_LABEL,()=>{throw new Error('transport unused')},'host');
const {app,ensurePostAuction,openTradeWindow,startXiBuilder,proposeTrade,respondTrade,autoPickXi,validateXi,xiTargetSize,lockXi,revealResults,renderResults,overseasCount}=engine;

const domesticWK=PLAYERS.filter(p=>!p.overseas&&p.role==='WK');
const domesticOther=PLAYERS.filter(p=>!p.overseas&&p.role!=='WK');
ok(domesticWK.length>=10,'Need at least ten domestic wicketkeepers for max-room fixture');
ok(domesticOther.length>=140,'Need enough domestic players for ten max-room squads');

let cursor=0;
const teams=FRANCHISES.map((f,i)=>{
  const selected=[domesticWK[i],...domesticOther.slice(cursor,cursor+14)];cursor+=14;
  return {
    id:`mx${i+1}`,ownerPeerId:i===0?'host':`peer${i+1}`,ownerName:`Owner ${i+1}`,
    name:f.name,colors:f.colors,mark:f.mark,kind:'franchise',templateId:f.id,
    budget:80,players:selected.map((p,j)=>({playerId:p.id,price:Math.round((.3+(j%8)*.25)*100)/100})),connected:true
  };
});
ok(new Set(teams.flatMap(t=>t.players.map(b=>b.playerId))).size===150,'Max-room squads must contain 150 unique players');
ok(teams.every(t=>t.players.length===15),'Each max-room fixture team must have 15 players');
ok(teams.every(t=>overseasCount(t)===0),'Domestic fixture should avoid overseas-limit noise');

app.network={selfId:'host',peers:new Set(teams.slice(1).map(t=>t.ownerPeerId)),send(){}};
app.networkStatus='online';
app.game={
  version:2,roomCode:'MAX10Q',hostPeerId:'host',phase:'postAuction',
  settings:{maxTeams:10,squadSize:15,purse:125,timerSeconds:12,overseasLimit:6,hallOfFame:true},
  teams,activity:[],stats:{bidCounts:{},warWins:{}},
  auction:{sold:teams.flatMap(t=>t.players.map(b=>({playerId:b.playerId,teamId:t.id,price:b.price,war:false,bidCount:1,bidTeamCounts:{[t.id]:1}})),unsold:[],queue:[],index:0,round:1,status:'sold',paused:false,passedTeamIds:[],bidHistory:[]}
};
app.route='postAuction';
ensurePostAuction(app.game);

openTradeWindow();
eq(app.game.phase,'trades','10-team room must open trade stage');
const t0=teams[0],t9=teams[9],offer=t0.players[1].playerId,want=t9.players[1].playerId;
proposeTrade(t0,{toTeamId:t9.id,offerPlayerId:offer,targetPlayerId:want});
const tr=app.game.postAuction.tradeProposals.at(-1);
ok(tr?.status==='pending','Max-room trade proposal should be pending');
respondTrade(t9,{tradeId:tr.id,accept:true});
eq(tr.status,'accepted','Max-room trade must complete');
eq(app.game.postAuction.tradesCompleted,1,'Max-room trade counter');

startXiBuilder();
eq(app.game.phase,'xi','10-team room must enter XI builder');
for(const team of teams){
  autoPickXi(team);
  eq(team.xi.playerIds.length,11,`${team.name} should auto-pick 11`);
  const [valid,reason]=validateXi(team);
  ok(valid,`${team.name} invalid XI: ${reason}`);
  lockXi(team);
  ok(team.xi.locked,`${team.name} should lock XI`);
}
ok(teams.every(t=>t.xi.locked),'All ten XIs must lock');

const started=performance.now();
revealResults();
eq(app.game.phase,'results','All ten locked XIs must reveal results');
const html=renderResults();
const renderMs=Math.round((performance.now()-started)*100)/100;
ok(html.includes('THE AUCTION DAILY'),'10-team results must render newspaper');
ok(html.includes('AUCTION HALL OF FAME'),'10-team results must render enabled Hall of Fame shell');
for(const t of teams)ok(html.includes(t.name),`Results missing team ${t.name}`);
const finalBytes=Buffer.byteLength(JSON.stringify(app.game));
ok(finalBytes<256000,`10-team final state too large: ${finalBytes}`);
ok(renderMs<1000,`10-team results render too slow in engine QA: ${renderMs}ms`);

console.log('HammerXI max-room post-auction PASS',{teams:teams.length,lockedXIs:teams.filter(t=>t.xi.locked).length,trades:app.game.postAuction.tradesCompleted,finalBytes,renderMs});
