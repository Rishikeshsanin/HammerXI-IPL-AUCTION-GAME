import { FRANCHISES, LOGO_PRESETS, PLAYERS, POOL_SIZE_BY_TEAMS, ROLE_LABEL } from './data.js';
import { joinRoom as joinPeerRoom, selfId as peerSelfId } from 'trystero';

const $ = s => document.querySelector(s);
const esc = (v='') => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
const uid=()=>crypto.randomUUID?.().slice(0,8) || Math.random().toString(36).slice(2,10);
const roomCode=()=>Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
const fmtPrice = n => n < 1 ? `₹${Math.round(n*100)}L` : `₹${Number.isInteger(n)?n.toFixed(0):n.toFixed(2).replace(/0$/,'')} Cr`;
const initials = name => name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const byId = id => PLAYERS.find(p=>p.id===id);
const hash = s => [...String(s)].reduce((a,c)=>(a*33+c.charCodeAt(0))>>>0,5381);
const rng = seed => { let x=hash(seed)||123456789; return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000} };
const shuffle=(arr,seed)=>{const r=rng(seed),a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

const app = {
  route:'home', rules:false, sound:true, draft:{
    ownerName:'', teamMode:'franchise', franchiseId:'rcb', customName:'', logoId:'volt', joinCode:'',
    maxTeams:6, squadSize:18, purse:125, timerSeconds:12
  },
  identity:null, network:null, game:null, networkStatus:'offline', pendingJoin:false,
  hostClock:null, timerClock:null, advanceTimer:null,
  photoCache:new Map(), photoInflight:new Map(),
  broadcastMode:false, lastTensionSecond:null, lastTensionLot:null
};

function colorsForTeam(t){return t?.colors || ['#667085','#98a2b3']}
function crest(team,size='sm'){
  if(!team)return '';
  const [a,b]=colorsForTeam(team);
  const symbol = esc(team.mark || team.symbol || initials(team.name));
  return `<div class="crest ${size}" style="background:linear-gradient(145deg,${a},${b})">${symbol}</div>`;
}
function toast(title,msg='',kind=''){
  const root=$('#toast-root'); if(!root)return;
  const el=document.createElement('div');el.className=`toast ${kind}`;el.innerHTML=`<strong>${esc(title)}</strong>${msg?`<span>${esc(msg)}</span>`:''}`;
  root.appendChild(el);setTimeout(()=>el.remove(),3600);
}
function beep(kind='bid'){
  if(!app.sound)return;
  try{
    const C=window.AudioContext||window.webkitAudioContext; const ctx=new C(); const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination); const now=ctx.currentTime; const tick=kind==='tick';
    o.type=kind==='sold'?'triangle':tick?'square':'sine';
    const startFreq=kind==='sold'?180:kind==='error'?110:tick?520:420;
    const endFreq=kind==='sold'?75:kind==='error'?80:tick?360:630;
    o.frequency.setValueAtTime(startFreq,now);o.frequency.exponentialRampToValueAtTime(endFreq,now+(tick ? .055 : .11));
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(tick ? .045 : .08,now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+(tick ? .075 : .22));
    o.start(now);o.stop(now+(tick ? .09 : .24));setTimeout(()=>ctx.close(),tick?160:400);
  }catch{}
}

function header(){
  const status= app.networkStatus==='online' ? ['Live P2P',''] : app.networkStatus==='local' ? ['Local fallback','warn'] : ['No room','off'];
  return `<header class="topbar">
    <button class="brand" data-action="home" style="background:none;border:0;color:inherit;padding:0"><span class="brand-mark"><span>H</span></span>HAMMER<span style="color:var(--accent)">XI</span><small class="version-mark">V2</small></button>
    <div class="top-actions">
      <span class="privacy-pill"><span class="dot"></span>No accounts · no permanent storage</span>
      <span class="status-pill"><span class="dot ${status[1]}"></span>${status[0]}</span>
      <button class="icon-btn" data-action="sound" title="Toggle sound">${app.sound?'♪':'×'}</button>
      <button class="icon-btn" data-action="rules" title="Rules">?</button>
    </div>
  </header>`;
}
function footer(){return `<footer class="footer-note"><span>HammerXI · an unofficial fan-made cricket auction game</span><span>Not affiliated with BCCI, IPL or any franchise · no official team logos bundled</span></footer>`}

function renderHome(){return `${header()}<main class="hero">
  <section>
    <div class="eyebrow">FRANCHISE AUCTION · LIVE WITH FRIENDS</div>
    <h1>Build the XI.<br><em>Own the auction.</em></h1>
    <p class="hero-copy">A live franchise auction room for 2–10 friends. Build a squad, protect your purse, win bidding wars and walk away with a share-ready team card. No signup. No saved history.</p>
    <div class="hero-actions"><button class="btn primary" data-action="go-create">Host an auction <span>→</span></button><button class="btn secondary" data-action="go-join">Join with code</button></div>
    <div class="feature-strip"><span><i></i>2–10 teams</span><span><i></i>Live P2P bidding</span><span><i></i>₹125 Cr default purse</span><span><i></i>30 original crest presets</span><span><i></i>Story exports</span></div>
  </section>
  <section class="hero-demo" aria-hidden="true"><div class="auction-preview">
    <div class="preview-header"><span class="live-dot">LIVE FRANCHISE AUCTION</span><span class="mini-pill">LOT 07 / 50</span></div>
    <div class="preview-player"><div class="silhouette">VK</div><span class="role">BATTER · INDIA</span><h3>Virat Kohli</h3><div class="row-between"><div><span class="tiny muted">CURRENT BID</span><div class="price">₹14.20 Cr</div></div><span class="mini-pill">RC XI leads</span></div></div>
    <button class="preview-bid">RAISE PADDLE · ₹14.40 CR</button>
    <div class="preview-stats"><div class="preview-stat"><span>Purse</span><strong>₹73.8 Cr</strong></div><div class="preview-stat"><span>Squad</span><strong>8 / 18</strong></div><div class="preview-stat"><span>Overseas</span><strong>3 / 7</strong></div></div>
  </div></section>
</main>${footer()}`}

function picker(){
  const d=app.draft;
  const teams=FRANCHISES.map(f=>`<button type="button" class="team-pick ${d.franchiseId===f.id?'selected':''}" data-action="pick-franchise" data-id="${f.id}" title="${esc(f.name)}">${crest({name:f.name,colors:f.colors,mark:f.mark},'sm')}<small>${f.short}</small></button>`).join('');
  const logos=LOGO_PRESETS.map(l=>`<button type="button" class="logo-pick ${d.logoId===l.id?'selected':''}" data-action="pick-logo" data-id="${l.id}" title="${esc(l.name)}">${crest({name:l.name,colors:l.colors,mark:l.symbol},'sm')}</button>`).join('');
  return `<div class="field full"><span class="label">Team identity</span><div class="segmented"><button type="button" data-action="team-mode" data-mode="franchise" class="${d.teamMode==='franchise'?'active':''}">Existing franchise</button><button type="button" data-action="team-mode" data-mode="custom" class="${d.teamMode==='custom'?'active':''}">Create my own</button></div></div>
  ${d.teamMode==='franchise'?`<div class="field full"><span class="label">Choose one</span><div class="franchise-grid">${teams}</div><span class="tiny muted">Fan-game presets use original generic badges, not official franchise logos.</span></div>`:`<><div class="field full"><label class="label" for="customName">Franchise name</label><input class="input" id="customName" data-draft="customName" maxlength="26" placeholder="e.g. Bengaluru Blazers" value="${esc(d.customName)}"></div><div class="field full"><span class="label">Choose a crest</span><div class="logo-grid">${logos}</div></div></>`}`;
}
function createSummary(){
  const d=app.draft, pool=POOL_SIZE_BY_TEAMS[d.maxTeams]; const foreign=d.squadSize>=18?7:6;
  return `<h3 class="setup-title" style="font-size:20px">Room defaults</h3><p class="small-copy muted">These are host-controlled and can still be adjusted in the lobby.</p>
  <div class="summary-block"><span>Capacity</span><strong>${d.maxTeams} teams</strong></div><div class="summary-block"><span>Squad</span><strong>${d.squadSize} players</strong></div><div class="summary-block"><span>Overseas cap</span><strong>${foreign}</strong></div><div class="summary-block"><span>Purse</span><strong>${fmtPrice(d.purse)}</strong></div><div class="summary-block"><span>Pool at capacity</span><strong>${pool} cricketers</strong></div><div class="summary-block"><span>Bid clock</span><strong>${d.timerSeconds}s</strong></div>
  <div class="rule-note">The live pool scales to the teams that actually start. The ₹125 Cr default is 2026-inspired; HammerXI squad sizes are intentionally shorter so friend auctions finish in one sitting.</div>`;
}
function renderCreate(){const d=app.draft;return `${header()}<div class="page-head"><div class="eyebrow">AUCTION CONTROL ROOM</div><h1 class="page-title">Set the table.</h1><p class="muted">You become the first franchise owner and auction host. No signup, no account.</p></div>
<div class="setup-layout"><form class="card setup-main" id="create-form"><h2 class="setup-title">Your franchise</h2><div class="form-grid"><div class="field full"><label class="label" for="ownerName">Your name</label><input class="input" id="ownerName" data-draft="ownerName" maxlength="22" required placeholder="Rishi" value="${esc(d.ownerName)}"></div>${picker()}
<div class="field"><label class="label">Room capacity</label><select class="select" data-draft="maxTeams">${Array.from({length:9},(_,i)=>i+2).map(n=>`<option value="${n}" ${d.maxTeams===n?'selected':''}>${n} teams</option>`).join('')}</select></div>
<div class="field"><label class="label">Squad size</label><select class="select" data-draft="squadSize">${[15,16,17,18,19,20].map(n=>`<option value="${n}" ${d.squadSize===n?'selected':''}>${n} players</option>`).join('')}</select></div>
<div class="field"><label class="label">Starting purse</label><select class="select" data-draft="purse">${[100,125,150].map(n=>`<option value="${n}" ${d.purse===n?'selected':''}>₹${n} Cr</option>`).join('')}</select></div>
<div class="field"><label class="label">Bid clock</label><select class="select" data-draft="timerSeconds">${[8,10,12,15,20].map(n=>`<option value="${n}" ${d.timerSeconds===n?'selected':''}>${n} seconds</option>`).join('')}</select></div></div>
<div style="display:flex;gap:10px;margin-top:24px"><button type="button" class="btn ghost" data-action="home">Back</button><button class="btn primary" style="flex:1" type="submit">Create room</button></div></form><aside class="card setup-side">${createSummary()}</aside></div>${footer()}`}
function renderJoin(){return `${header()}<div class="page-head"><div class="eyebrow">JOIN THE AUCTION</div><h1 class="page-title">Take your seat.</h1><p class="muted">Use the 6-character room code from your auction host.</p></div><div class="setup-layout"><form class="card setup-main" id="join-form"><h2 class="setup-title">Your seat at the table</h2><div class="form-grid"><div class="field"><label class="label">Room code</label><input class="input" data-draft="joinCode" maxlength="6" required placeholder="HX7K9Q" value="${esc(app.draft.joinCode)}" style="text-transform:uppercase;letter-spacing:.14em;font-weight:800"></div><div class="field"><label class="label">Your name</label><input class="input" data-draft="ownerName" maxlength="22" required placeholder="Your name" value="${esc(app.draft.ownerName)}"></div>${picker()}</div><div style="display:flex;gap:10px;margin-top:24px"><button type="button" class="btn ghost" data-action="home">Back</button><button class="btn primary" style="flex:1" type="submit">Join auction</button></div></form><aside class="card setup-side"><h3 class="setup-title" style="font-size:20px">Private by design</h3><p class="small-copy muted">HammerXI has no user account system and no auction-history database. Your name, team and bids exist in the live room only.</p><div class="rule-note">Internet rooms use encrypted browser-to-browser WebRTC. If that network is unavailable, HammerXI falls back to a local same-browser test mode and tells you clearly.</div></aside></div>${footer()}`}

function getMyTeam(){return app.game?.teams.find(t=>t.ownerPeerId===app.network?.selfId)}
function amHost(){return !!app.game && app.game.hostPeerId===app.network?.selfId}
function connectedLabel(){return app.networkStatus==='online'?'Encrypted P2P':app.networkStatus==='local'?'Local test transport':'Connecting'}
function renderLobby(){
  const g=app.game;if(!g)return renderConnecting(); const me=getMyTeam();
  const teams=g.teams.map(t=>`<div class="team-row ${t.id===me?.id?'me':''}">${crest(t,'sm')}<div class="info"><strong>${esc(t.name)}</strong><span>${esc(t.ownerName)}${t.connected===false?' · disconnected':''}</span></div>${t.ownerPeerId===g.hostPeerId?'<span class="host-badge">Host</span>':''}</div>`).join('');
  const opts=(vals,key,suffix='')=>vals.map(v=>`<option value="${v}" ${g.settings[key]===v?'selected':''}>${v}${suffix}</option>`).join('');
  const pool=POOL_SIZE_BY_TEAMS[clamp(g.teams.length,2,10)];
  return `${header()}<div class="page-head"><div class="row-between"><div><div class="eyebrow">FRANCHISE LOBBY</div><div class="room-code">${esc(g.roomCode)}</div></div><button class="btn secondary" data-action="copy-room">Copy invite code</button></div></div>
  <div class="lobby-layout"><section class="card lobby-main"><div class="row-between"><div><h2 class="setup-title">Franchises</h2><p class="muted small-copy">${g.teams.length} joined · ${g.settings.maxTeams-g.teams.length} seats open</p></div><span class="mini-pill">${connectedLabel()}</span></div><div class="team-list">${teams}${Array.from({length:Math.max(0,g.settings.maxTeams-g.teams.length)},()=>'<div class="team-row" style="opacity:.45"><div class="crest sm" style="background:#151b24">+</div><div class="info"><strong>Open seat</strong><span>Waiting for a friend…</span></div></div>').join('')}</div></section>
  <aside class="card lobby-side"><div class="section-label">Auction settings</div><div class="settings-grid">
  <div class="setting-row"><label>Room capacity</label><select class="select" data-setting="maxTeams" ${amHost()?'':'disabled'}>${opts([2,3,4,5,6,7,8,9,10],'maxTeams',' teams')}</select></div>
  <div class="setting-row"><label>Squad size</label><select class="select" data-setting="squadSize" ${amHost()?'':'disabled'}>${opts([15,16,17,18,19,20],'squadSize','')}</select></div>
  <div class="setting-row"><label>Starting purse</label><select class="select" data-setting="purse" ${amHost()?'':'disabled'}>${opts([100,125,150],'purse',' Cr')}</select></div>
  <div class="setting-row"><label>Bid clock</label><select class="select" data-setting="timerSeconds" ${amHost()?'':'disabled'}>${opts([8,10,12,15,20],'timerSeconds','s')}</select></div>
  <div class="setting-row"><label>Hall of Fame</label><select class="select" data-setting="hallOfFame" ${amHost()?'':'disabled'}><option value="0" ${!g.settings.hallOfFame?'selected':''}>Off</option><option value="1" ${g.settings.hallOfFame?'selected':''}>On</option></select></div></div>
  <div class="summary-block"><span>Overseas cap</span><strong>${g.settings.squadSize>=18?7:6}</strong></div><div class="summary-block"><span>Player pool now</span><strong>${pool}</strong></div><div class="connection-banner"><span class="dot ${app.networkStatus==='local'?'warn':''}"></span><span>${amHost()?'You are the auction host. Your browser validates every bid and broadcasts the official room state.':'The host validates every bid, purse and squad rule before it becomes official.'}</span></div>
  ${amHost()?`<button class="btn primary" data-action="start-auction" style="width:100%;margin-top:14px" ${g.teams.length<2?'disabled':''}>${g.teams.length<2?'Need at least 2 teams':'Start live auction'}</button>`:'<div class="waiting" style="margin-top:16px"><span class="spinner"></span><span class="small-copy muted">Waiting for host to start…</span></div>'}</aside></div>${footer()}`;
}
function renderConnecting(){return `${header()}<div class="page-head"><div class="eyebrow">Joining room</div><h1 class="page-title">Finding the auction host…</h1><div class="connection-banner" style="max-width:560px"><span class="spinner"></span><span>Connecting to the private peer room. Keep this tab open.</span></div><button class="btn ghost" data-action="leave" style="margin-top:16px">Cancel</button></div>`}

function incrementFor(price){if(price<1)return .05;if(price<2)return .1;if(price<5)return .2;return .25}
function nextBidAmount(auction,player){return auction.highestTeamId?round2(auction.currentBid+incrementFor(auction.currentBid)):player.basePrice}
function overseasCount(team){return team.players.filter(x=>byId(x.playerId)?.overseas).length}
function maxAllowedBid(team,settings){const remainingAfter=Math.max(0,settings.squadSize-team.players.length-1);return round2(team.budget-remainingAfter*.3)}
function canTeamBid(team,player,amount,g){
  if(!team||team.connected===false)return [false,'Team is disconnected'];
  if(team.players.length>=g.settings.squadSize)return [false,'Squad is already full'];
  if(player.overseas&&overseasCount(team)>=g.settings.overseasLimit)return [false,'Overseas squad limit reached'];
  const max=maxAllowedBid(team,g.settings); if(amount>max+.0001)return [false,`Purse protection: max bid ${fmtPrice(Math.max(0,max))}`];
  if(g.auction.passedTeamIds.includes(team.id))return [false,'You passed on this player'];
  if(g.auction.highestTeamId===team.id)return [false,'You already hold the highest bid'];
  return [true,''];
}
function currentLot(g=app.game){return g?.auction?.queue?.[g.auction.index]}
function currentPlayer(g=app.game){const l=currentLot(g);return l?byId(l.playerId):null}
const PHOTO_ALIASES={
  'N. Tilak Varma':'Tilak Varma',
  'Mohd. Arshad Khan':'Arshad Khan (cricketer)',
  'M. Siddharth':'Manimaran Siddharth'
};
function playerPhotoQuery(p){return PHOTO_ALIASES[p.name]||p.name}
async function fetchPlayerPhoto(p){
  if(app.photoCache.has(p.id))return app.photoCache.get(p.id);
  if(app.photoInflight.has(p.id))return app.photoInflight.get(p.id);
  const task=(async()=>{
    try{
      const expected=playerPhotoQuery(p);
      const q=new URLSearchParams({
        action:'query',
        titles:expected,
        redirects:'1',
        prop:'pageimages|info',
        piprop:'thumbnail',
        pithumbsize:'900',
        pilicense:'free',
        inprop:'url',
        format:'json',
        origin:'*'
      });
      const res=await fetch(`https://en.wikipedia.org/w/api.php?${q}`,{credentials:'omit',referrerPolicy:'no-referrer'});
      if(!res.ok)throw new Error(`Wikipedia photo lookup failed: ${res.status}`);
      const json=await res.json();
      const page=Object.values(json?.query?.pages||{})[0];
      const valid=page && !('missing' in page) && page.thumbnail?.source;
      const photo=valid?{
        src:String(page.thumbnail.source).replace(/^http:/,'https:'),
        sourceUrl:page.fullurl||'https://en.wikipedia.org/',
        title:page.title||expected
      }:null;
      app.photoCache.set(p.id,photo);return photo;
    }catch{
      app.photoCache.set(p.id,null);return null;
    }finally{app.photoInflight.delete(p.id)}
  })();
  app.photoInflight.set(p.id,task);return task;
}
function photoMarkup(p){
  const cached=app.photoCache.get(p.id);
  return `<img id="player-photo" class="player-photo${cached?.src?' ready':''}" data-player-id="${esc(p.id)}" ${cached?.src?`src="${esc(cached.src)}"`:''} alt="${esc(p.name)}" decoding="async" referrerpolicy="no-referrer"><div class="player-photo-shade"></div><a id="player-photo-credit" class="player-photo-credit${cached?.sourceUrl?' ready':''}" ${cached?.sourceUrl?`href="${esc(cached.sourceUrl)}"`:''} target="_blank" rel="noreferrer noopener">PHOTO · WIKIMEDIA</a>`;
}
async function hydratePlayerPhoto(){
  const p=currentPlayer();if(!p)return;
  const img=$('#player-photo');if(!img||img.dataset.playerId!==p.id)return;
  const photo=await fetchPlayerPhoto(p);
  const current=$('#player-photo');if(!photo?.src||!current||current.dataset.playerId!==p.id)return;
  current.onload=()=>current.classList.add('ready');
  current.onerror=()=>current.classList.remove('ready');
  if(current.src!==photo.src)current.src=photo.src;else if(current.complete)current.classList.add('ready');
  const credit=$('#player-photo-credit');if(credit&&photo.sourceUrl){credit.href=photo.sourceUrl;credit.classList.add('ready')}
}
function updateBiddingWar(g){
  const a=g.auction;if(!a||a.status!=='live')return;
  const recent=(a.bidHistory||[]).filter(x=>Date.now()-x.at<=15000);a.bidHistory=recent;
  const tail=recent.slice(-6),teams=[...new Set(tail.map(x=>x.teamId))];
  const alternating=tail.length>=5&&tail.slice(-5).every((x,i,arr)=>i===0||x.teamId!==arr[i-1].teamId);
  if(!a.war?.active&&tail.length>=5&&teams.length===2&&alternating){
    a.war={active:true,teamIds:teams,bidCount:recent.length,since:Date.now()};
    const names=teams.map(id=>g.teams.find(t=>t.id===id)?.name).filter(Boolean);
    addActivity(`BIDDING WAR — ${names.join(' vs ')}.`,'war');
  }else if(a.war?.active){a.war.bidCount=recent.length}
}
function biddingWarLabel(g){
  const w=g?.auction?.war;if(!w?.active)return '';
  const teams=w.teamIds.map(id=>g.teams.find(t=>t.id===id)).filter(Boolean);
  return `<div class="war-banner"><span class="war-flame">🔥</span><div><strong>BIDDING WAR</strong><span>${teams.map(t=>esc(t.name)).join(' <i>VS</i> ')} · ${w.bidCount} bids</span></div></div>`;
}

function renderScoreTeam(t,me,g){const passed=g.auction.passedTeamIds.includes(t.id);return `<div class="score-team ${t.id===me?.id?'me':''} ${g.auction.highestTeamId===t.id?'leading':''} ${passed?'passed':''}">${crest(t,'sm')}<div class="meta"><strong>${esc(t.name)}</strong><span>${t.players.length}/${g.settings.squadSize} · ${overseasCount(t)}/${g.settings.overseasLimit} OS</span></div><div class="team-auction-state">${passed?'<span class="pass-state">PASS</span>':''}<div class="money">${fmtPrice(t.budget)}</div></div></div>`}
function renderAuction(){
  const g=app.game,p=currentPlayer(g),lot=currentLot(g),me=getMyTeam();if(!p||!lot)return renderLobby();
  const a=g.auction,lead=g.teams.find(t=>t.id===a.highestTeamId),next=nextBidAmount(a,p),[can,reason]=canTeamBid(me,p,next,g); const passed=a.passedTeamIds.includes(me?.id);
  const teams=g.teams.map(t=>renderScoreTeam(t,me,g)).join('');
  const mine=me?.players.slice().reverse().map(x=>`<div class="squad-mini"><strong>${esc(byId(x.playerId)?.name||'Player')}</strong><span>${fmtPrice(x.price)}</span></div>`).join('')||'';
  const feed=g.activity.slice(-26).reverse().map(e=>`<div class="feed-item ${e.kind||''}">${esc(e.text)}</div>`).join('');
  const role=ROLE_LABEL[p.role]; const pct=100; const war=biddingWarLabel(g);
  return `${header()}${war}<main class="auction-shell"><aside class="auction-col left card auction-side"><div class="row-between"><div class="section-label">Franchise board</div><span class="mini-pill">${g.teams.length}</span></div>${teams}<div style="height:12px"></div><div class="section-label">My squad</div><div class="my-squad">${mine||'<div class="empty" style="padding:14px;font-size:11px">No buys yet.</div>'}</div></aside>
  <section class="auction-col card auction-main"><div class="auction-stage">${a.paused?'<div class="paused-banner">Auction paused by host</div>':''}<div class="stage-top"><div><div class="live-dot">LIVE AUCTION FLOOR</div><div class="lot-tag" style="margin-top:7px">${esc(lot.setLabel)} · LOT ${a.index+1}/${a.queue.length}${a.round===2?' · RECALL':''}</div></div><div class="timer" id="timer" style="--pct:${pct}"><span id="timer-text">${g.settings.timerSeconds}</span></div></div>
  <div class="player-stage"><div class="player-visual">${photoMarkup(p)}<span class="origin-tag">${p.originalTeam} · ${p.overseas?'OVERSEAS':'INDIA'}</span><div class="player-initials">${initials(p.name)}</div><div class="player-visual-meta"><div class="role">${role}</div><div class="tiny muted" style="margin-top:4px">Game reserve ${fmtPrice(p.basePrice)}</div></div></div>
  <div class="player-copy"><div class="player-tags"><span class="tag">${role}</span><span class="tag">${p.overseas?'Overseas':'Indian'}</span><span class="tag">Rating ${p.rating}</span></div><h1>${esc(p.name)}</h1><div class="bid-block"><div class="bid-caption">${lead?'Current bid':'Reserve price'}</div><div class="big-price">${fmtPrice(a.currentBid)}</div><div class="leader-name">${lead?`Highest: <strong>${esc(lead.name)}</strong>`:'Waiting for the opening bid'}</div>
  <div class="bid-actions"><button class="bid-btn" data-action="bid" ${!can||a.status!=='live'?'disabled':''}>${lead?`BID ${fmtPrice(next)}`:`OPEN AT ${fmtPrice(next)}`}</button><button class="pass-btn ${passed?'undo':''}" data-action="pass" ${a.status!=='live'||a.paused||a.highestTeamId===me?.id?'disabled':''}>${passed?'UNDO PASS':'PASS'}</button></div><div class="reason">${passed?'Passed for this player — UNDO PASS stays available until the hammer falls.':can?`Next increment: ${fmtPrice(incrementFor(a.currentBid))} · Max safe bid ${fmtPrice(maxAllowedBid(me,g.settings))}`:esc(reason)}</div></div></div></div>
  ${a.status==='sold'?`<div class="sold-overlay"><div class="sold-rays"></div><div class="gavel-swing">🔨</div><div class="hammer-card">${a.resolution?.war?'<div class="sold-war">🔥 BIDDING WAR WON</div>':''}<div class="hammer-word">SOLD</div><div class="sold-player">${esc(p.name)}</div><div class="sold-to">${crest(g.teams.find(t=>t.id===a.resolution.teamId),'sm')}<span>TO <strong>${esc(g.teams.find(t=>t.id===a.resolution.teamId)?.name||'')}</strong></span></div><div class="hammer-price">${fmtPrice(a.resolution.price)}</div></div></div>`:''}
  ${a.status==='unsold'?`<div class="sold-overlay"><div class="hammer-card"><div class="hammer-word unsold">UNSOLD</div><div class="hammer-sub">${esc(p.name)} goes to ${a.round===1?'the recall list':'the archives'}</div></div></div>`:''}
  </div><div class="auction-mobile-stats"><div class="metric"><span>Purse</span><strong>${fmtPrice(me?.budget||0)}</strong></div><div class="metric"><span>Squad</span><strong>${me?.players.length||0}/${g.settings.squadSize}</strong></div><div class="metric"><span>Overseas</span><strong>${overseasCount(me||{players:[]})}/${g.settings.overseasLimit}</strong></div></div></section>
  <aside class="auction-col right card auction-side"><div class="section-label">Room activity</div><div class="feed" id="feed">${feed||'<div class="feed-item">Auction activity will appear here.</div>'}</div><div class="chat-box"><input class="input" id="chat-input" maxlength="70" placeholder="Auction chat… keep it clean"><button class="icon-btn" data-action="send-chat">↗</button></div><div class="reactions"><button class="reaction" data-action="reaction" data-value="🔥">🔥</button><button class="reaction" data-action="reaction" data-value="😂">😂</button><button class="reaction" data-action="reaction" data-value="💀">💀</button><button class="reaction" data-action="reaction" data-value="👏">👏</button></div><div style="height:18px"></div><div class="section-label">Auction control</div>${amHost()?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px"><button class="btn small secondary" data-action="pause">${a.paused?'▶ Continue auction':'⏸ Pause auction'}</button><button class="btn small ghost" data-action="force-next">Skip lot</button></div>`:`<div class="small-copy muted">Host controls the hammer and auction flow.</div>`}<button class="btn small broadcast-toggle" data-action="toggle-broadcast" style="width:100%;margin-top:7px">🏟️ Broadcast screen</button><div class="summary-block"><span>Pool</span><strong>${a.queue.length} lots</strong></div><div class="summary-block"><span>Sold</span><strong>${a.sold.length}</strong></div><div class="summary-block"><span>Recall</span><strong>${a.round===2?'Active':`${a.unsold.length} waiting`}</strong></div></aside></main>`;
}

function renderBroadcastAuction(){
  const g=app.game,p=currentPlayer(g),lot=currentLot(g);if(!p||!lot)return renderLobby();
  const a=g.auction,lead=g.teams.find(t=>t.id===a.highestTeamId),role=ROLE_LABEL[p.role],war=biddingWarLabel(g);
  const board=g.teams.map((t,i)=>`<div class="broadcast-team ${a.highestTeamId===t.id?'leading':''} ${a.passedTeamIds.includes(t.id)?'passed':''}"><span class="broadcast-rank">${String(i+1).padStart(2,'0')}</span>${crest(t,'sm')}<div><strong>${esc(t.name)}</strong><span>${t.players.length}/${g.settings.squadSize} players · ${overseasCount(t)}/${g.settings.overseasLimit} OS</span></div><b>${fmtPrice(t.budget)}</b></div>`).join('');
  return `<div class="broadcast-shell">${war}<div class="broadcast-top"><div class="brand broadcast-brand"><span class="brand-mark"><span>H</span></span>HAMMER<span style="color:var(--accent)">XI</span></div><div class="broadcast-live"><span class="live-dot">LIVE AUCTION</span><span>${esc(lot.setLabel)} · LOT ${a.index+1}/${a.queue.length}</span></div><button class="btn small secondary" data-action="toggle-broadcast">Exit broadcast</button></div>
  <main class="broadcast-main">${a.paused?'<div class="paused-banner">Auction paused by host</div>':''}<section class="broadcast-player"><div class="broadcast-photo">${photoMarkup(p)}<div class="player-initials">${initials(p.name)}</div><span class="origin-tag">${p.originalTeam} · ${p.overseas?'OVERSEAS':'INDIA'}</span></div><div class="broadcast-player-copy"><div class="player-tags"><span class="tag">${role}</span><span class="tag">${p.overseas?'Overseas':'Indian'}</span><span class="tag">Rating ${p.rating}</span></div><h1>${esc(p.name)}</h1><div class="broadcast-bid-label">${lead?'CURRENT BID':'RESERVE PRICE'}</div><div class="broadcast-price">${fmtPrice(a.currentBid)}</div><div class="broadcast-leader">${lead?`LEADING · <strong>${esc(lead.name)}</strong>`:'WAITING FOR THE OPENING BID'}</div></div><div class="broadcast-clock timer" id="timer"><span id="timer-text">${g.settings.timerSeconds}</span></div></section>
  <aside class="broadcast-board"><div class="section-label">FRANCHISE BOARD</div>${board}</aside>
  ${a.status==='sold'?`<div class="sold-overlay broadcast-sold"><div class="sold-rays"></div><div class="gavel-swing">🔨</div><div class="hammer-card">${a.resolution?.war?'<div class="sold-war">🔥 BIDDING WAR WON</div>':''}<div class="hammer-word">SOLD</div><div class="sold-player">${esc(p.name)}</div><div class="sold-to">${crest(g.teams.find(t=>t.id===a.resolution.teamId),'sm')}<span>TO <strong>${esc(g.teams.find(t=>t.id===a.resolution.teamId)?.name||'')}</strong></span></div><div class="hammer-price">${fmtPrice(a.resolution.price)}</div></div></div>`:''}
  ${a.status==='unsold'?`<div class="sold-overlay broadcast-sold"><div class="hammer-card"><div class="hammer-word unsold">UNSOLD</div><div class="sold-player">${esc(p.name)}</div></div></div>`:''}
  </main></div>`;
}


function ensurePostAuction(g){
  g.postAuction=g.postAuction||{tradeProposals:[],tradesCompleted:0};
  g.teams.forEach(t=>{t.xi=t.xi||{playerIds:[],captainId:null,wicketkeeperId:null,locked:false}});
  return g.postAuction;
}
function renderPostAuction(){
  const g=app.game;ensurePostAuction(g);
  return `${header()}<div class="post-shell"><section class="card post-hero"><div class="eyebrow">AUCTION COMPLETE</div><h1>Before the final XI...</h1><p>The squads are bought. The host can open a quick player-for-player trade window, or skip it and move straight to Playing XI selection.</p><div class="post-flow"><span class="done">Auction ✓</span><span>Trade window</span><span>Playing XI</span><span>Final reveal</span></div>${amHost()?`<div class="post-actions"><button class="btn primary" data-action="open-trades">🤝 Open trade window</button><button class="btn secondary" data-action="skip-trades">Skip trades → Playing XI</button></div>`:`<div class="waiting"><span class="spinner"></span><span>Waiting for the host to choose the next stage…</span></div>`}</section></div>${footer()}`;
}
function renderTradeWindow(){
  const g=app.game,post=ensurePostAuction(g),me=getMyTeam();
  const myPlayers=me?.players||[];
  const targetOptions=g.teams.filter(t=>t.id!==me?.id).flatMap(t=>t.players.map(b=>`<option value="${t.id}::${b.playerId}">${esc(t.name)} — ${esc(byId(b.playerId)?.name||'Player')}</option>`)).join('');
  const myOptions=myPlayers.map(b=>`<option value="${b.playerId}">${esc(byId(b.playerId)?.name||'Player')}</option>`).join('');
  const proposals=post.tradeProposals.slice().reverse().map(tr=>{
    const from=g.teams.find(t=>t.id===tr.fromTeamId),to=g.teams.find(t=>t.id===tr.toTeamId),offer=byId(tr.offerPlayerId),want=byId(tr.targetPlayerId);
    const incoming=tr.toTeamId===me?.id&&tr.status==='pending';
    return `<div class="trade-row ${tr.status}"><div><strong>${esc(from?.name||'Team')}</strong><span>offers ${esc(offer?.name||'Player')} for ${esc(want?.name||'Player')} · ${esc(to?.name||'Team')}</span></div><b>${tr.status.toUpperCase()}</b>${incoming?`<div class="trade-actions"><button class="btn small primary" data-action="trade-accept" data-trade="${tr.id}">Accept</button><button class="btn small ghost" data-action="trade-reject" data-trade="${tr.id}">Reject</button></div>`:''}</div>`;
  }).join('');
  return `${header()}<div class="trade-shell"><section class="card trade-market"><div class="row-between"><div><div class="eyebrow">OPTIONAL TRADE WINDOW</div><h1>Make the last deal.</h1><p class="muted">V2 trades are simple one-player-for-one-player swaps. Both squads must still respect the overseas limit.</p></div><span class="mini-pill">${post.tradesCompleted} completed</span></div>
  <div class="trade-builder"><div class="field"><label class="label">Offer from ${esc(me?.name||'your team')}</label><select class="select" id="trade-offer">${myOptions||'<option>No players</option>'}</select></div><div class="trade-swap">⇄</div><div class="field"><label class="label">Player you want</label><select class="select" id="trade-target">${targetOptions||'<option>No trade targets</option>'}</select></div><button class="btn primary" data-action="trade-propose" ${!myPlayers.length||!targetOptions?'disabled':''}>Send trade offer</button></div>
  <div class="section-label" style="margin-top:24px">Trade desk</div><div class="trade-list">${proposals||'<div class="empty">No offers yet.</div>'}</div></section>
  <aside class="card trade-side"><h3>Trade rules</h3><p>• Player-for-player only<br>• Receiver must accept<br>• Overseas squad limits still apply<br>• Host can end the window at any time</p>${amHost()?`<button class="btn secondary" data-action="close-trades" style="width:100%;margin-top:16px">End trades → Playing XI</button>`:'<div class="waiting"><span class="spinner"></span><span>Host controls when trading ends.</span></div>'}</aside></div>${footer()}`;
}
function xiSelectedOverseas(team){return (team.xi?.playerIds||[]).filter(id=>byId(id)?.overseas).length}
function autoPickXi(team){
  ensurePostAuction(app.game);
  const sorted=team.players.map(b=>byId(b.playerId)).filter(Boolean).sort((a,b)=>b.rating-a.rating);
  const chosen=[],wk=sorted.find(p=>p.role==='WK');
  if(wk){chosen.push(wk.id)}
  for(const p of sorted){
    if(chosen.includes(p.id)||chosen.length>=11)continue;
    const os=chosen.filter(id=>byId(id)?.overseas).length;
    if(p.overseas&&os>=4)continue;
    chosen.push(p.id);
  }
  team.xi.playerIds=chosen.slice(0,11);
  team.xi.captainId=team.xi.playerIds[0]||null;
  team.xi.wicketkeeperId=team.xi.playerIds.find(id=>byId(id)?.role==='WK')||null;
  team.xi.locked=false;
}
function validateXi(team){
  const ids=team.xi?.playerIds||[];
  if(ids.length!==11)return [false,'Pick exactly 11 players'];
  if(xiSelectedOverseas(team)>4)return [false,'Playing XI can have at most 4 overseas players'];
  if(!team.xi.captainId||!ids.includes(team.xi.captainId))return [false,'Choose a captain from the XI'];
  const squadHasWK=team.players.some(b=>byId(b.playerId)?.role==='WK');
  if(squadHasWK&&!ids.some(id=>byId(id)?.role==='WK'))return [false,'Include at least one wicketkeeper'];
  if(ids.some(id=>byId(id)?.role==='WK')&&(!team.xi.wicketkeeperId||!ids.includes(team.xi.wicketkeeperId)||byId(team.xi.wicketkeeperId)?.role!=='WK'))return [false,'Choose the wicketkeeper'];
  return [true,''];
}
function renderXiBuilder(){
  const g=app.game;ensurePostAuction(g);const me=getMyTeam(),xi=me?.xi||{playerIds:[]},ids=xi.playerIds||[];
  const squad=(me?.players||[]).map(b=>{const p=byId(b.playerId),selected=ids.includes(b.playerId);return `<button class="xi-player ${selected?'selected':''}" data-action="xi-toggle" data-player="${b.playerId}" ${xi.locked?'disabled':''}><span class="xi-check">${selected?'✓':'+'}</span><div><strong>${esc(p?.name||'Player')}</strong><span>${esc(ROLE_LABEL[p?.role]||'Player')} · ${p?.overseas?'Overseas':'India'} · Rating ${p?.rating||'—'}</span></div></button>`}).join('');
  const selectedPlayers=ids.map(id=>byId(id)).filter(Boolean);
  const capOptions=selectedPlayers.map(p=>`<option value="${p.id}" ${xi.captainId===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
  const wkOptions=selectedPlayers.filter(p=>p.role==='WK').map(p=>`<option value="${p.id}" ${xi.wicketkeeperId===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
  const status=g.teams.map(t=>`<div class="xi-status">${crest(t,'sm')}<span>${esc(t.name)}</span><b class="${t.xi?.locked?'ok':''}">${t.xi?.locked?'LOCKED':`${t.xi?.playerIds?.length||0}/11`}</b></div>`).join('');
  const [valid,why]=validateXi(me);
  return `${header()}<div class="xi-shell"><section class="card xi-main"><div class="row-between"><div><div class="eyebrow">PLAYING XI BUILDER</div><h1>${esc(me?.name||'Your XI')}</h1><p class="muted">Pick 11. Maximum 4 overseas players. Choose your captain and wicketkeeper.</p></div><div class="xi-count"><strong>${ids.length}/11</strong><span>${xiSelectedOverseas(me)}/4 overseas</span></div></div><div class="xi-grid">${squad}</div></section>
  <aside class="card xi-side"><div class="section-label">XI controls</div><button class="btn secondary" data-action="xi-auto" style="width:100%" ${xi.locked?'disabled':''}>Auto-pick strongest XI</button><div class="field" style="margin-top:14px"><label class="label">Captain</label><select class="select" id="xi-captain" ${xi.locked||!capOptions?'disabled':''}><option value="">Choose captain</option>${capOptions}</select></div><div class="field"><label class="label">Wicketkeeper</label><select class="select" id="xi-keeper" ${xi.locked||!wkOptions?'disabled':''}><option value="">Choose keeper</option>${wkOptions}</select></div><button class="btn primary" data-action="xi-lock" style="width:100%;margin-top:12px" ${xi.locked||!valid?'disabled':''}>${xi.locked?'XI locked':'Lock Playing XI'}</button>${!valid&&!xi.locked?`<div class="reason">${esc(why)}</div>`:''}<div class="section-label" style="margin-top:22px">Room status</div><div class="xi-status-list">${status}</div>${amHost()?`<button class="btn ghost" data-action="xi-autofill-all" style="width:100%;margin-top:12px">Auto-fill unlocked teams</button><button class="btn primary" data-action="reveal-results" style="width:100%;margin-top:8px" ${g.teams.every(t=>t.xi?.locked)?'':'disabled'}>Reveal final results</button>`:'<div class="waiting" style="margin-top:14px"><span class="spinner"></span><span>Waiting for every team to lock an XI.</span></div>'}</aside></div>${footer()}`;
}
function newspaperData(g){
  const sold=g.auction?.sold||[],post=ensurePostAuction(g);
  const biggest=sold.length?[...sold].sort((a,b)=>b.price-a.price)[0]:null;
  const bp=biggest?byId(biggest.playerId):null,bt=biggest?g.teams.find(t=>t.id===biggest.teamId):null;
  const spender=[...g.teams].sort((a,b)=>(g.settings.purse-b.budget)-(g.settings.purse-a.budget))[0];
  const bidEntry=Object.entries(g.stats?.bidCounts||{}).sort((a,b)=>b[1]-a[1])[0];
  const bidder=bidEntry?g.teams.find(t=>t.id===bidEntry[0]):null;
  return {biggest,bp,bt,spender,bidder,bids:bidEntry?.[1]||0,trades:post.tradesCompleted||0,wars:sold.filter(x=>x.war).length};
}
function renderNewspaper(g){
  const n=newspaperData(g);
  return `<section class="card newspaper"><div class="newspaper-mast"><span>HAMMERXI</span><strong>THE AUCTION DAILY</strong><small>ROOM ${esc(g.roomCode)} · V2 EDITION</small></div><div class="newspaper-grid"><article class="newspaper-lead"><div class="newspaper-kicker">FRONT PAGE</div><h2>${n.bp?`${esc(n.bp.name)} goes for ${fmtPrice(n.biggest.price)}`:'The hammer falls on another auction night'}</h2><p>${n.bt?`${esc(n.bt.name)} landed the night's biggest purchase after the live auction floor closed.`:'Final squads are now locked.'}</p></article><article><div class="newspaper-kicker">MARKET</div><h3>${esc(n.spender?.name||'Franchise')} spent big</h3><p>${fmtPrice(round2(g.settings.purse-(n.spender?.budget||g.settings.purse)))} committed across the squad.</p></article><article><div class="newspaper-kicker">AUCTION DESK</div><h3>${n.wars} bidding war${n.wars===1?'':'s'}</h3><p>${n.bidder?`${esc(n.bidder.name)} placed ${n.bids} accepted bids.`:'Every franchise played its part.'}</p></article><article><div class="newspaper-kicker">TRANSFER DESK</div><h3>${n.trades} completed trade${n.trades===1?'':'s'}</h3><p>The optional trade window closed before Playing XIs were locked.</p></article></div><button class="btn secondary" data-action="download-newspaper">Download newspaper poster</button></section>`;
}

function bestBuy(team){if(!team.players.length)return null;return [...team.players].sort((a,b)=>{const pa=byId(a.playerId),pb=byId(b.playerId);return (pb.rating/(b.price+.25))-(pa.rating/(a.price+.25))})[0]}
function renderResults(){
  const g=app.game,me=getMyTeam();ensurePostAuction(g);
  const cards=g.teams.map(t=>{const spent=round2(g.settings.purse-t.budget),bb=bestBuy(t),[a,b]=colorsForTeam(t),xiIds=t.xi?.playerIds||[],xiText=xiIds.map(id=>byId(id)?.name).filter(Boolean).join(' · ');return `<article class="card result-team" style="--team-a:${a};--team-b:${b}"><div class="result-head">${crest(t,'lg')}<div class="copy"><h3>${esc(t.name)}</h3><p>${esc(t.ownerName)} · ${t.players.length} players</p></div>${t.id===me?.id?'<span class="host-badge">YOUR TEAM</span>':''}</div><div class="result-metrics"><div class="metric"><span>Spent</span><strong>${fmtPrice(spent)}</strong></div><div class="metric"><span>Left</span><strong>${fmtPrice(t.budget)}</strong></div><div class="metric"><span>Overseas</span><strong>${overseasCount(t)}</strong></div></div><div class="players-cloud">${t.players.slice().sort((x,y)=>y.price-x.price).map(x=>`<span class="player-chip">${esc(byId(x.playerId)?.name)} · ${fmtPrice(x.price)}</span>`).join('')||'<span class="muted tiny">No purchases</span>'}</div>${xiText?`<div class="xi-result"><span>PLAYING XI</span><p>${esc(xiText)}</p><small>Captain: ${esc(byId(t.xi?.captainId)?.name||'—')} · WK: ${esc(byId(t.xi?.wicketkeeperId)?.name||'—')}</small></div>`:''}${bb?`<div class="rule-note" style="margin-top:12px">Value pick: <strong>${esc(byId(bb.playerId)?.name)}</strong> at ${fmtPrice(bb.price)} — based on HammerXI rating ÷ auction price.</div>`:''}<div class="result-actions"><button class="btn small primary" data-action="story" data-team="${t.id}">Download story card</button></div></article>`}).join('');
  return `${header()}<div class="results-layout" data-hof="${g.settings.hallOfFame?'1':'0'}">${renderNewspaper(g)}<section class="card result-hero"><div><div class="eyebrow">Auction complete</div><h1 class="setup-title" style="font-size:38px;margin-top:8px">The squads are locked.</h1><p class="muted">Nothing is saved on a HammerXI account. Download what you want before you leave.</p></div><div class="result-actions"><button class="btn secondary" data-action="csv">Download auction CSV</button><button class="btn ghost" data-action="leave">Leave room</button></div></section><div class="result-grid">${cards}</div></div>${footer()}`;
}

function rulesModal(){if(!app.rules)return '';return `<div class="modal-backdrop" data-action="close-rules"><div class="modal card" onclick="event.stopPropagation()"><div class="row-between"><div><div class="eyebrow">HammerXI rules</div><h2>Fast enough for friends. Strict enough to feel real.</h2></div><button class="icon-btn" data-action="close-rules">×</button></div><div class="rules-list">
${[
['Squads','2–10 franchises. Host selects 15–20 squad spots; the default is 18. Overseas cap is 6 for smaller squads and 7 for squads of 18–20.'],
['Purse','₹125 Cr is the 2026-inspired default purse. HammerXI also offers ₹100 Cr and ₹150 Cr casual presets.'],
['Player pool','Automatically scales with the number of teams that actually start: 50 players for 2 teams, up to 235 for 10.'],
['Reserve prices','Reserve tiers use ₹30L, ₹40L, ₹50L, ₹75L, ₹1 Cr, ₹1.25 Cr, ₹1.5 Cr and ₹2 Cr, mirroring the 2026 auction ladder while player placement in those bands remains a HammerXI game rating.'],
['Bid increments','₹5L below ₹1 Cr; ₹10L from ₹1–2 Cr; ₹20L from ₹2–5 Cr; ₹25L above ₹5 Cr.'],
['Purse protection','A bid is blocked if it would leave less than ₹30L for each remaining mandatory squad slot.'],
['Pass & hammer','PASS is reversible while the lot is live. Passing never pauses, resets or ends the countdown; use UNDO PASS to re-enter before the hammer falls.'],
['Recall round','Unsold players receive one accelerated recall round if at least one franchise still has an open squad slot.'],
['Privacy','No login, no profile database, no saved auction history. Live data sits in the connected browsers and disappears when the room ends.']
].map((x,i)=>`<div class="rule-item"><div class="rule-num">${i+1}</div><div><strong>${x[0]}</strong><p>${x[1]}</p></div></div>`).join('')}</div><button class="btn primary" data-action="close-rules" style="width:100%;margin-top:20px">Got it</button></div></div>`}
function render(){
  const root=$('#app');
  const page=app.route==='home'?renderHome():app.route==='create'?renderCreate():app.route==='join'?renderJoin():app.route==='lobby'?renderLobby():app.route==='auction'?(app.broadcastMode?renderBroadcastAuction():renderAuction()):app.route==='postAuction'?renderPostAuction():app.route==='trades'?renderTradeWindow():app.route==='xi'?renderXiBuilder():app.route==='results'?renderResults():renderHome();
  root.innerHTML=`<div class="shell">${page}</div>${rulesModal()}`;
  if(app.route==='auction'){updateTimerDom();hydratePlayerPhoto()}
}

function identityFromDraft(){
  const d=app.draft; const ownerName=d.ownerName.trim(); if(!ownerName)throw new Error('Enter your name');
  if(d.teamMode==='franchise'){
    const f=FRANCHISES.find(x=>x.id===d.franchiseId); if(!f)throw new Error('Choose a franchise');
    return {ownerName,templateId:f.id,name:f.name,colors:f.colors,mark:f.mark,kind:'franchise'};
  }
  const name=d.customName.trim(); if(name.length<2)throw new Error('Enter a custom franchise name'); const l=LOGO_PRESETS.find(x=>x.id===d.logoId)||LOGO_PRESETS[0];
  return {ownerName,templateId:`custom:${l.id}`,name,colors:l.colors,mark:l.symbol,kind:'custom'};
}

async function initNetwork(code){
  await closeNetwork(); app.networkStatus='connecting'; render();
  let net;
  try{
    if(typeof RTCPeerConnection==='undefined' || typeof WebSocket==='undefined') throw new Error('This browser does not support required realtime APIs');
    const selfId=peerSelfId; const room=joinPeerRoom({appId:'hammerxi-auction-night-v2',password:`hx-${code}`},code); const wire=room.makeAction('wire'); const peers=new Set();
    net={kind:'p2p',selfId,roomCode:code,peers,send:(type,payload,target)=>wire.send({type,payload},{...(target?{target}: {})}),close:()=>room.leave()};
    wire.onMessage=(packet,{peerId})=>receiveNetwork(packet,peerId);
    room.onPeerJoin=peerId=>{if(!peers.has(peerId)){peers.add(peerId);onPeerJoin(peerId)}};
    room.onPeerLeave=peerId=>{peers.delete(peerId);onPeerLeave(peerId)};
    app.networkStatus='online';
  }catch(err){
    const selfId=`local-${uid()}`; const bc=new BroadcastChannel(`hammerxi-${code}`); const peers=new Set();
    net={kind:'local',selfId,roomCode:code,peers,send:(type,payload,target)=>bc.postMessage({from:selfId,target,type,payload}),close:()=>bc.close()};
    bc.onmessage=e=>{const m=e.data||{};if(m.from===selfId||m.target&&m.target!==selfId)return;if(m.type==='presence'){if(!peers.has(m.from)){peers.add(m.from);onPeerJoin(m.from)};bc.postMessage({from:selfId,target:m.from,type:'presence-ack'});return}if(m.type==='presence-ack'){if(!peers.has(m.from)){peers.add(m.from);onPeerJoin(m.from)};return}receiveNetwork({type:m.type,payload:m.payload},m.from)};
    setTimeout(()=>bc.postMessage({from:selfId,type:'presence'}),50); app.networkStatus='local';
    toast('Internet P2P unavailable','This browser entered local test mode. It cannot discover a room hosted in another browser.','err');
  }
  app.network=net; render(); return net;
}
async function closeNetwork(){
  clearInterval(app.hostClock);clearInterval(app.timerClock);clearTimeout(app.advanceTimer);app.hostClock=app.timerClock=app.advanceTimer=null;
  try{app.network?.close?.()}catch{} app.network=null;app.networkStatus='offline';
}
function onPeerJoin(peerId){
  if(!app.network)return;
  if(app.game&&amHost()){
    // New peers must explicitly request a franchise before receiving room state.
  } else if(app.pendingJoin&&app.identity){setTimeout(()=>app.network?.send('join',app.identity,peerId),120)}
}
function onPeerLeave(peerId){
  if(!app.game)return;
  const t=app.game.teams.find(x=>x.ownerPeerId===peerId);if(t)t.connected=false;
  if(app.game.hostPeerId===peerId){
    const candidates=app.game.teams.filter(x=>x.connected!==false).map(x=>x.ownerPeerId).filter(Boolean); if(app.network?.selfId&&!candidates.includes(app.network.selfId))candidates.push(app.network.selfId);
    const next=[...new Set(candidates)].sort()[0]; if(next){app.game.hostPeerId=next; addActivity(`Host disconnected. ${app.game.teams.find(x=>x.ownerPeerId===next)?.ownerName||'A peer'} is now auction host.`,'sold');}
  }
  if(amHost()){broadcast();startHostClock()} render();
}
function receiveNetwork(packet,peerId){
  if(!packet?.type)return;
  const {type,payload}=packet;
  if(type==='join'&&app.game&&amHost())handleJoin(peerId,payload);
  else if(type==='ack'&&app.pendingJoin){
    if(payload.accepted){app.game=payload.game;app.pendingJoin=false;app.route=app.game.phase==='lobby'?'lobby':app.game.phase;startTimerClock();render();toast('Joined the auction',`You are ${getMyTeam()?.name||'in the room'}.`,'ok')}
    else {toast('Could not join',payload.reason||'Room rejected the request.','err')}
  } else if(type==='cmd'&&app.game&&amHost())handleCommand(peerId,payload);
  else if(type==='snapshot'&&app.game){
    const oldStatus=app.game?.auction?.status,oldBid=app.game?.auction?.currentBid; app.game=payload;
    app.route=payload.phase==='lobby'?'lobby':payload.phase;
    if(payload.auction?.status==='sold'&&oldStatus!=='sold')beep('sold');else if(payload.auction?.currentBid!==oldBid)beep('bid');
    startTimerClock();render();
  } else if(type==='notice')toast(payload.title||'Auction',payload.message||'',payload.kind||'');
}
function broadcast(){if(!app.game||!app.network)return;app.network.send('snapshot',structuredClone(app.game));render()}
function sendNotice(peerId,title,message,kind='err'){if(peerId===app.network?.selfId)toast(title,message,kind);else app.network?.send('notice',{title,message,kind},peerId)}
function addActivity(text,kind=''){if(!app.game)return;app.game.activity.push({id:uid(),text,kind,at:Date.now()});app.game.activity=app.game.activity.slice(-60)}

function handleJoin(peerId,ident){
  const g=app.game;if(g.phase!=='lobby')return sendNotice(peerId,'Auction already started','This room is no longer accepting franchises.');
  const existing=g.teams.find(t=>t.ownerPeerId===peerId);if(existing){app.network.send('ack',{accepted:true,game:structuredClone(g)},peerId);return}
  if(g.teams.length>=g.settings.maxTeams)return app.network.send('ack',{accepted:false,reason:'The room is full.'},peerId);
  const sameName=g.teams.some(t=>t.name.toLowerCase()===String(ident.name).toLowerCase()); if(sameName)return app.network.send('ack',{accepted:false,reason:'That franchise name is already taken. Pick another.'},peerId);
  if(ident.kind==='franchise'&&g.teams.some(t=>t.kind==='franchise'&&t.templateId===ident.templateId))return app.network.send('ack',{accepted:false,reason:'That IPL franchise is already taken in this room.'},peerId);
  const t={id:uid(),ownerPeerId:peerId,ownerName:String(ident.ownerName).slice(0,22),name:String(ident.name).slice(0,26),colors:ident.colors,mark:ident.mark,kind:ident.kind,templateId:ident.templateId,budget:g.settings.purse,players:[],connected:true};
  g.teams.push(t);addActivity(`${t.ownerName} joined as ${t.name}.`);app.network.send('ack',{accepted:true,game:structuredClone(g)},peerId);broadcast();
}
function handleCommand(peerId,cmd){
  if(!app.game||!cmd)return;
  const g=app.game,team=g.teams.find(t=>t.ownerPeerId===peerId);
  if(cmd.type==='setting')return applySetting(peerId,cmd);
  if(cmd.type==='start')return startAuction(peerId);
  if(cmd.type==='chat'){const text=String(cmd.text||'').trim().slice(0,70);if(text&&team){addActivity(`${team.ownerName}: ${text}`,'');broadcast()}return}
  if(cmd.type==='reaction'){if(team){addActivity(`${team.ownerName} reacted ${String(cmd.value||'').slice(0,4)}`);broadcast()}return}
  if(cmd.type==='open-trades'&&peerId===g.hostPeerId)return openTradeWindow();
  if(cmd.type==='start-xi'&&peerId===g.hostPeerId)return startXiBuilder();
  if(cmd.type==='trade-propose'&&team)return proposeTrade(team,cmd);
  if(cmd.type==='trade-respond'&&team)return respondTrade(team,cmd);
  if(cmd.type==='xi-toggle'&&team)return toggleXiPlayer(team,cmd.playerId);
  if(cmd.type==='xi-auto'&&team){autoPickXi(team);broadcast();return}
  if(cmd.type==='xi-role'&&team)return setXiRole(team,cmd.role,cmd.playerId);
  if(cmd.type==='xi-lock'&&team)return lockXi(team);
  if(cmd.type==='xi-autofill-all'&&peerId===g.hostPeerId)return autoFillAllXi();
  if(cmd.type==='reveal-results'&&peerId===g.hostPeerId)return revealResults();
  if(g.phase!=='auction'||!team)return;
  if(cmd.type==='bid')placeBid(peerId,team);
  else if(cmd.type==='pass')passLot(peerId,team);
  else if(cmd.type==='pause'&&peerId===g.hostPeerId)togglePause();
  else if(cmd.type==='force-next'&&peerId===g.hostPeerId){g.auction.highestTeamId?resolveSold():resolveUnsold(true)}
}
function openTradeWindow(){
  const g=app.game;ensurePostAuction(g);g.phase='trades';addActivity('Host opened the optional trade window.','sold');app.route='trades';broadcast();
}
function startXiBuilder(){
  const g=app.game;ensurePostAuction(g);g.phase='xi';addActivity('Playing XI selection is open.','sold');app.route='xi';broadcast();
}
function proposeTrade(team,cmd){
  const g=app.game;if(g.phase!=='trades')return;const post=ensurePostAuction(g);
  const to=g.teams.find(t=>t.id===cmd.toTeamId);if(!to||to.id===team.id)return sendNotice(team.ownerPeerId,'Trade blocked','Choose another franchise.');
  const own=team.players.find(b=>b.playerId===cmd.offerPlayerId),target=to.players.find(b=>b.playerId===cmd.targetPlayerId);
  if(!own||!target)return sendNotice(team.ownerPeerId,'Trade blocked','One of those players is no longer available.');
  const busy=post.tradeProposals.some(x=>x.status==='pending'&&[x.offerPlayerId,x.targetPlayerId].some(id=>id===cmd.offerPlayerId||id===cmd.targetPlayerId));
  if(busy)return sendNotice(team.ownerPeerId,'Trade blocked','One of those players is already in a pending offer.');
  const tr={id:uid(),fromTeamId:team.id,toTeamId:to.id,offerPlayerId:cmd.offerPlayerId,targetPlayerId:cmd.targetPlayerId,status:'pending',at:Date.now()};
  post.tradeProposals.push(tr);addActivity(`${team.name} sent a trade offer to ${to.name}.`,'bid');broadcast();
}
function respondTrade(team,cmd){
  const g=app.game;if(g.phase!=='trades')return;const post=ensurePostAuction(g),tr=post.tradeProposals.find(x=>x.id===cmd.tradeId&&x.status==='pending');
  if(!tr||tr.toTeamId!==team.id)return;
  const from=g.teams.find(t=>t.id===tr.fromTeamId),to=g.teams.find(t=>t.id===tr.toTeamId);if(!from||!to)return;
  if(!cmd.accept){tr.status='rejected';addActivity(`${to.name} rejected a trade from ${from.name}.`);broadcast();return}
  const fi=from.players.findIndex(b=>b.playerId===tr.offerPlayerId),ti=to.players.findIndex(b=>b.playerId===tr.targetPlayerId);
  if(fi<0||ti<0){tr.status='expired';broadcast();return}
  const offer=from.players[fi],want=to.players[ti],offerOS=byId(offer.playerId)?.overseas?1:0,wantOS=byId(want.playerId)?.overseas?1:0;
  const fromOS=overseasCount(from)-offerOS+wantOS,toOS=overseasCount(to)-wantOS+offerOS;
  if(fromOS>g.settings.overseasLimit||toOS>g.settings.overseasLimit){tr.status='blocked';sendNotice(team.ownerPeerId,'Trade blocked','The swap would break an overseas squad limit.');broadcast();return}
  from.players[fi]={...want,tradedFrom:to.id};to.players[ti]={...offer,tradedFrom:from.id};tr.status='accepted';post.tradesCompleted++;
  post.tradeProposals.forEach(x=>{if(x.status==='pending'&&x.id!==tr.id&&[x.offerPlayerId,x.targetPlayerId].some(id=>id===tr.offerPlayerId||id===tr.targetPlayerId))x.status='expired'});
  addActivity(`TRADE — ${from.name} and ${to.name} complete a player swap.`,'sold');broadcast();
}
function toggleXiPlayer(team,playerId){
  const g=app.game;if(g.phase!=='xi'||team.xi?.locked)return;ensurePostAuction(g);
  if(!team.players.some(b=>b.playerId===playerId))return;
  const ids=team.xi.playerIds,i=ids.indexOf(playerId);
  if(i>=0){ids.splice(i,1);if(team.xi.captainId===playerId)team.xi.captainId=null;if(team.xi.wicketkeeperId===playerId)team.xi.wicketkeeperId=null}
  else{if(ids.length>=11)return sendNotice(team.ownerPeerId,'Playing XI full','Remove someone before adding another player.');if(byId(playerId)?.overseas&&xiSelectedOverseas(team)>=4)return sendNotice(team.ownerPeerId,'Overseas XI limit','A Playing XI can have at most 4 overseas players.');ids.push(playerId)}
  broadcast();
}
function setXiRole(team,role,playerId){
  if(app.game.phase!=='xi'||team.xi?.locked)return;const id=playerId||null;
  if(id&&!team.xi.playerIds.includes(id))return;
  if(role==='captain')team.xi.captainId=id;
  if(role==='wicketkeeper'&&(!id||byId(id)?.role==='WK'))team.xi.wicketkeeperId=id;
  broadcast();
}
function lockXi(team){
  if(app.game.phase!=='xi')return;const [ok,why]=validateXi(team);if(!ok)return sendNotice(team.ownerPeerId,'XI not ready',why);
  team.xi.locked=true;addActivity(`${team.name} locked its Playing XI.`,'sold');broadcast();
}
function autoFillAllXi(){
  const g=app.game;if(g.phase!=='xi')return;for(const t of g.teams){if(!t.xi?.locked){autoPickXi(t);const [ok]=validateXi(t);if(ok)t.xi.locked=true}}broadcast();
}
function revealResults(){
  const g=app.game;if(g.phase!=='xi'||!g.teams.every(t=>t.xi?.locked))return;
  g.phase='results';addActivity('Playing XIs locked. Final reveal is live.','sold');app.route='results';broadcast();
}

function command(cmd){if(!app.game||!app.network)return;if(amHost())handleCommand(app.network.selfId,cmd);else app.network.send('cmd',cmd,app.game.hostPeerId)}
function applySetting(peerId,cmd){
  const g=app.game;if(peerId!==g.hostPeerId||g.phase!=='lobby')return;const key=cmd.key;let value=Number(cmd.value);
  if(key==='maxTeams')value=clamp(value,Math.max(2,g.teams.length),10);
  else if(key==='squadSize')value=clamp(value,15,20);
  else if(key==='purse'&&!([100,125,150].includes(value)))return;
  else if(key==='timerSeconds'&&!([8,10,12,15,20].includes(value)))return;
  else if(key==='hallOfFame')value=value===1;
  else if(!['maxTeams','squadSize','purse','timerSeconds','hallOfFame'].includes(key))return;
  g.settings[key]=value;g.settings.overseasLimit=g.settings.squadSize>=18?7:6;if(key==='purse')g.teams.forEach(t=>{if(!t.players.length)t.budget=value});broadcast();
}
function buildPool(count,seed){
  const n=POOL_SIZE_BY_TEAMS[clamp(count,2,10)]; const ranked=[...PLAYERS].sort((a,b)=>b.rating-a.rating||a.name.localeCompare(b.name)); const top=ranked.slice(0,12); const rest=ranked.slice(12); const bands=[];
  for(let i=0;i<rest.length;i+=20)bands.push(...shuffle(rest.slice(i,i+20),`${seed}-${i}`));return [...top,...bands].slice(0,n);
}
const SPECIALIST_SPINNERS=new Set([
  'Rashid Khan','Noor Ahmad','Rahul Chahar','Kuldeep Yadav','Varun Chakaravarthy','Ravi Bishnoi','Yuzvendra Chahal',
  'Keshav Maharaj','Shreyas Gopal','Mayank Markande','Suyash Sharma','Akeal Hosein','Prashant Solanki','Rehan Ahmed',
  'Zeeshan Ansari','Vignesh Puthur','Allah Ghazanfar','Mujeeb Ur Rahman','Maheesh Theekshana','Adam Zampa'
]);
function auctionGroup(p){
  if(p.role==='WK')return 'Wicketkeepers';
  if(p.role==='BAT')return 'Batters';
  if(p.role==='AR')return 'All-Rounders';
  if(p.role==='BOWL'&&SPECIALIST_SPINNERS.has(p.name))return 'Spin Bowlers';
  return 'Pace Bowlers';
}
function buildQueue(pool,seed){
  const marqueePlayers=[...pool].sort((a,b)=>b.rating-a.rating).slice(0,12);
  const marquee=shuffle(marqueePlayers,`${seed}-marquee`).map(p=>({playerId:p.id,setLabel:'Marquee · Set 1',category:'Marquee'}));
  const marqueeIds=new Set(marqueePlayers.map(p=>p.id));
  const rem=pool.filter(p=>!marqueeIds.has(p.id));
  const sequence=['Wicketkeepers','Batters','All-Rounders','Spin Bowlers','Pace Bowlers'];
  const out=[...marquee];
  for(const category of sequence){
    const players=shuffle(rem.filter(p=>auctionGroup(p)===category),`${seed}-${category}`);
    for(let i=0;i<players.length;i+=8){
      const setNo=Math.floor(i/8)+1;
      out.push(...players.slice(i,i+8).map(p=>({playerId:p.id,setLabel:`${category} · Set ${setNo}`,category})));
    }
  }
  return out;
}
function startAuction(peerId){
  const g=app.game;if(peerId!==g.hostPeerId||g.phase!=='lobby'||g.teams.length<2)return;g.settings.overseasLimit=g.settings.squadSize>=18?7:6;g.teams.forEach(t=>{t.budget=g.settings.purse;t.players=[];t.connected=t.connected!==false});const pool=buildPool(g.teams.length,g.roomCode);const queue=buildQueue(pool,g.roomCode);
  g.stats={bidCounts:{},warWins:{}};g.phase='auction';g.auction={queue,index:0,round:1,currentBid:byId(queue[0].playerId).basePrice,highestTeamId:null,passedTeamIds:[],deadline:Date.now()+g.settings.timerSeconds*1000,status:'live',paused:false,pauseRemaining:0,sold:[],unsold:[],resolution:null,bidHistory:[],war:null};addActivity(`Auction started with ${pool.length} players for ${g.teams.length} franchises.`,'sold');app.route='auction';app.broadcastMode=false;broadcast();startHostClock();startTimerClock();
}
function placeBid(peerId,team){
  const g=app.game,a=g.auction,p=currentPlayer(g);if(a.status!=='live'||a.paused)return sendNotice(peerId,'Bid blocked','The auction clock is paused.');const amount=nextBidAmount(a,p);const [ok,reason]=canTeamBid(team,p,amount,g);if(!ok){beep('error');return sendNotice(peerId,'Bid blocked',reason)}
  a.currentBid=amount;a.highestTeamId=team.id;const now=Date.now();a.bidHistory=(a.bidHistory||[]).filter(x=>now-x.at<=15000);a.bidHistory.push({teamId:team.id,at:now});g.stats=g.stats||{bidCounts:{},warWins:{}};g.stats.bidCounts[team.id]=(g.stats.bidCounts[team.id]||0)+1;updateBiddingWar(g);
  const reset=Math.max(5000,Math.round(g.settings.timerSeconds*.65)*1000);a.deadline=now+reset;app.lastTensionSecond=null;addActivity(`${team.name} bids ${fmtPrice(amount)} for ${p.name}.`,'bid');beep('bid');broadcast();
}
function passLot(peerId,team){
  const g=app.game,a=g.auction,p=currentPlayer(g);if(a.status!=='live'||a.paused||a.highestTeamId===team.id)return;
  const i=a.passedTeamIds.indexOf(team.id);
  if(i>=0){a.passedTeamIds.splice(i,1);addActivity(`${team.name} undoes PASS and re-enters for ${p.name}.`,'bid')}
  else{a.passedTeamIds.push(team.id);addActivity(`${team.name} passes on ${p.name}.`)}
  broadcast();
}
function potentialTeam(t,p){if(t.connected===false||t.players.length>=app.game.settings.squadSize)return false;if(p.overseas&&overseasCount(t)>=app.game.settings.overseasLimit)return false;const amount=nextBidAmount(app.game.auction,p);return amount<=maxAllowedBid(t,app.game.settings)+.0001}
function checkLotViability(){
  const g=app.game,a=g.auction,p=currentPlayer(g);if(!p||a.status!=='live')return;
  const eligible=g.teams.filter(t=>potentialTeam(t,p));
  if(!eligible.length)resolveUnsold();
}
function resolveSold(){
  const g=app.game,a=g.auction;if(a.status!=='live'||!a.highestTeamId)return;const p=currentPlayer(g),t=g.teams.find(x=>x.id===a.highestTeamId),war=!!a.war?.active;
  t.budget=round2(t.budget-a.currentBid);t.players.push({playerId:p.id,price:a.currentBid});a.sold.push({playerId:p.id,teamId:t.id,price:a.currentBid,war,bidCount:(a.bidHistory||[]).length});a.status='sold';a.resolution={teamId:t.id,price:a.currentBid,war};
  if(war){g.stats=g.stats||{bidCounts:{},warWins:{}};g.stats.warWins[t.id]=(g.stats.warWins[t.id]||0)+1}
  addActivity(`SOLD — ${p.name} to ${t.name} for ${fmtPrice(a.currentBid)}.`,'sold');beep('sold');broadcast();scheduleAdvance();
}
function resolveUnsold(forced=false){
  const g=app.game,a=g.auction;if(a.status!=='live')return;const p=currentPlayer(g);if(a.round===1&&!a.unsold.includes(p.id))a.unsold.push(p.id);a.status='unsold';a.resolution={forced};addActivity(`${p.name} is unsold${forced?' (host skip)':''}.`);broadcast();scheduleAdvance();
}
function scheduleAdvance(){clearTimeout(app.advanceTimer);if(!amHost())return;app.advanceTimer=setTimeout(()=>{app.advanceTimer=null;advancePlayer()},2800)}
function advancePlayer(){
  const g=app.game,a=g.auction;if(!amHost()||g.phase!=='auction')return;if(g.teams.every(t=>t.connected===false||t.players.length>=g.settings.squadSize)){finishAuction();return}
  a.index++;
  if(a.index>=a.queue.length){
    if(a.round===1&&a.unsold.length&&g.teams.some(t=>t.connected!==false&&t.players.length<g.settings.squadSize)){
      const recall=shuffle(a.unsold,g.roomCode+'-recall').map(id=>({playerId:id,setLabel:'Accelerated Recall'}));a.queue=recall;a.index=0;a.round=2;a.unsold=[];addActivity(`Accelerated recall begins with ${recall.length} unsold players.`,'sold');
    }else {finishAuction();return}
  }
  const p=currentPlayer(g);a.currentBid=p.basePrice;a.highestTeamId=null;a.passedTeamIds=[];a.deadline=Date.now()+g.settings.timerSeconds*1000;a.status='live';a.paused=false;a.pauseRemaining=0;a.resolution=null;a.bidHistory=[];a.war=null;app.lastTensionSecond=null;app.lastTensionLot=null;broadcast();checkLotViability();
}
function finishAuction(){const g=app.game;ensurePostAuction(g);g.phase='postAuction';addActivity('Auction complete. Post-auction stage is open.','sold');app.route='postAuction';app.broadcastMode=false;broadcast();clearInterval(app.hostClock)}
function togglePause(){const g=app.game,a=g.auction;if(a.status!=='live')return;if(!a.paused){a.pauseRemaining=Math.max(0,a.deadline-Date.now());a.paused=true;addActivity('Host paused the auction.')}else{a.deadline=Date.now()+Math.max(2500,a.pauseRemaining);a.paused=false;addActivity('Auction resumed.')}broadcast()}
function startHostClock(){clearInterval(app.hostClock);if(!amHost()||app.game?.phase!=='auction')return;app.hostClock=setInterval(()=>{const a=app.game?.auction;if(!a)return;if((a.status==='sold'||a.status==='unsold')&&!app.advanceTimer)scheduleAdvance();if(a.status==='live'&&!a.paused&&Date.now()>=a.deadline){a.highestTeamId?resolveSold():resolveUnsold()}},180)}
function startTimerClock(){if(app.timerClock)return;app.timerClock=setInterval(updateTimerDom,120)}
function updateTimerDom(){
  const el=$('#timer'),txt=$('#timer-text'),g=app.game;if(!el||!txt||g?.phase!=='auction')return;const a=g.auction;if(a.paused){txt.textContent='Ⅱ';el.style.setProperty('--pct','100');return}
  const total=g.settings.timerSeconds*1000,left=Math.max(0,a.deadline-Date.now()),sec=Math.ceil(left/1000),pct=clamp((left/total)*100,0,100),lotKey=`${a.round}:${a.index}`;
  txt.textContent=String(sec);el.style.setProperty('--pct',String(pct));const tension=sec<=3&&sec>0&&a.status==='live';el.classList.toggle('danger',tension);document.querySelector('.auction-stage, .broadcast-main')?.classList.toggle('tension',tension);
  if(app.lastTensionLot!==lotKey){app.lastTensionLot=lotKey;app.lastTensionSecond=null}
  if(tension&&app.lastTensionSecond!==sec){app.lastTensionSecond=sec;beep('tick');document.querySelector('.auction-stage, .broadcast-main')?.setAttribute('data-countdown',String(sec))}
}

function drawStory(team){
  const g=app.game,c=document.createElement('canvas');c.width=1080;c.height=1920;const x=c.getContext('2d'),[a,b]=colorsForTeam(team);const grad=x.createLinearGradient(0,0,1080,1920);grad.addColorStop(0,'#07120d');grad.addColorStop(.58,'#0c1812');grad.addColorStop(1,'#050907');x.fillStyle=grad;x.fillRect(0,0,1080,1920);
  const glow=x.createRadialGradient(850,220,20,850,220,700);glow.addColorStop(0,a+'99');glow.addColorStop(1,'#00000000');x.fillStyle=glow;x.fillRect(0,0,1080,1000);
  x.fillStyle='#f2c94c';x.font='700 28px Segoe UI, Arial, sans-serif';x.fillText('HAMMERXI  /  FRANCHISE AUCTION',72,95);x.fillStyle='#707b8b';x.font='500 21px Segoe UI, Arial, sans-serif';x.fillText(`ROOM ${g.roomCode} · SQUAD LOCKED`,72,137);
  x.fillStyle='#ffffff';x.font='800 72px Segoe UI, Arial, sans-serif';wrapText(x,team.name,72,300,900,82,2);x.fillStyle='#9aa89f';x.font='500 28px Segoe UI, Arial, sans-serif';x.fillText(`Owned by ${team.ownerName}`,72,460);
  // crest
  x.save();x.translate(810,260);x.fillStyle=a;x.beginPath();x.moveTo(110,0);x.lineTo(210,40);x.lineTo(200,170);x.lineTo(110,235);x.lineTo(20,170);x.lineTo(10,40);x.closePath();x.fill();x.fillStyle='#fff';x.font='800 58px Segoe UI, Arial, sans-serif';x.textAlign='center';x.fillText(team.mark||initials(team.name),110,135);x.restore();x.textAlign='left';
  const spent=round2(g.settings.purse-team.budget);statBox(x,72,550,'SPENT',fmtPrice(spent));statBox(x,382,550,'PURSE LEFT',fmtPrice(team.budget));statBox(x,692,550,'OVERSEAS',`${overseasCount(team)} / ${g.settings.overseasLimit}`);
  x.fillStyle='#ffffff';x.font='700 29px Segoe UI, Arial, sans-serif';x.fillText('THE SQUAD',72,770);const players=[...team.players].sort((u,v)=>v.price-u.price);players.slice(0,20).forEach((buy,i)=>{const p=byId(buy.playerId),col=i<10?0:1,row=i%10,left=72+col*476,top=820+row*88;x.fillStyle=row%2?'#0b1510':'#101c15';roundRect(x,left,top,440,76,12,true);x.fillStyle='#ffffff';x.font='600 19px Segoe UI, Arial, sans-serif';x.fillText(`${String(i+1).padStart(2,'0')}  ${p.name}`,left+18,top+29);x.fillStyle='#9aa89f';x.font='500 15px Segoe UI, Arial, sans-serif';x.fillText(`${ROLE_LABEL[p.role]}${p.overseas?' · OS':''}`,left+18,top+55);x.fillStyle='#f2c94c';x.textAlign='right';x.font='700 17px Segoe UI, Arial, sans-serif';x.fillText(fmtPrice(buy.price),left+420,top+55);x.textAlign='left'});
  x.fillStyle='#5f6a79';x.font='500 18px Segoe UI, Arial, sans-serif';x.fillText('No signup. No saved history. Just auction night.',72,1810);x.fillStyle='#ffffff';x.font='800 33px Segoe UI, Arial, sans-serif';x.fillText(location.host || 'HammerXI',72,1860);
  c.toBlob(blob=>{const url=URL.createObjectURL(blob),ael=document.createElement('a');ael.href=url;ael.download=`hammerxi-${team.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-story.png`;ael.click();setTimeout(()=>URL.revokeObjectURL(url),1500)},'image/png');
}
function drawNewspaper(){
  const g=app.game,n=newspaperData(g),c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');
  x.fillStyle='#efe8d6';x.fillRect(0,0,c.width,c.height);x.fillStyle='#171713';x.fillRect(52,52,976,4);
  x.textAlign='center';x.fillStyle='#171713';x.font='900 34px Georgia, serif';x.fillText('HAMMERXI',540,105);x.font='900 74px Georgia, serif';x.fillText('THE AUCTION DAILY',540,180);x.font='600 18px Georgia, serif';x.fillText(`ROOM ${g.roomCode}  •  V2 EDITION  •  AUCTION NIGHT`,540,222);x.fillRect(52,246,976,3);x.textAlign='left';
  const headline=n.bp?`${n.bp.name.toUpperCase()} BREAKS THE BANK`:'THE HAMMER FALLS';
  x.font='900 60px Georgia, serif';wrapText(x,headline,66,345,948,66,3);x.font='600 24px Georgia, serif';x.fillText(n.biggest?`${n.bt?.name||'A franchise'} seal the biggest deal at ${fmtPrice(n.biggest.price)}.`:'Final squads have been locked.',66,500);
  x.fillRect(66,545,948,2);x.font='900 25px Georgia, serif';x.fillText('MARKET WATCH',66,600);x.font='700 36px Georgia, serif';wrapText(x,`${n.spender?.name||'Franchise'} commit ${fmtPrice(round2(g.settings.purse-(n.spender?.budget||g.settings.purse)))} across the squad.`,66,650,430,45,4);
  x.font='900 25px Georgia, serif';x.fillText('AUCTION DESK',570,600);x.font='700 36px Georgia, serif';wrapText(x,`${n.wars} bidding war${n.wars===1?'':'s'} lit up the floor. ${n.bidder?.name||'The room'} led the accepted-bid count with ${n.bids}.`,570,650,430,45,5);
  x.fillRect(66,920,948,2);x.font='900 25px Georgia, serif';x.fillText('TRANSFER DESK',66,975);x.font='700 34px Georgia, serif';wrapText(x,`${n.trades} player-for-player trade${n.trades===1?'':'s'} completed before the Playing XIs were locked.`,66,1025,934,44,4);
  x.fillRect(66,1220,948,2);x.font='600 18px Georgia, serif';x.fillText('No accounts. No saved history. One auction night.',66,1270);x.textAlign='right';x.fillText(location.host||'HammerXI',1014,1270);
  c.toBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`hammerxi-${g.roomCode}-auction-daily.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)},'image/png');
}

function statBox(x,left,top,label,value){x.fillStyle='#0d131c';roundRect(x,left,top,286,135,18,true);x.fillStyle='#707c8d';x.font='700 17px Segoe UI, Arial, sans-serif';x.fillText(label,left+24,top+38);x.fillStyle='#fff';x.font='800 32px Segoe UI, Arial, sans-serif';x.fillText(value,left+24,top+90)}
function roundRect(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));if(fill)ctx.fill()}
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){const words=text.split(' ');let line='',lines=[];for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}if(line)lines.push(line);lines.slice(0,maxLines).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight))}
function downloadCsv(){const g=app.game;const rows=[['Team','Owner','Player','Role','Overseas','Price (Cr)']];g.teams.forEach(t=>t.players.forEach(b=>{const p=byId(b.playerId);rows.push([t.name,t.ownerName,p.name,ROLE_LABEL[p.role],p.overseas?'Yes':'No',b.price])}));const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`hammerxi-${g.roomCode}-auction.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

async function createRoom(){
  try{app.identity=identityFromDraft();const code=roomCode();const net=await initNetwork(code);const t={id:uid(),ownerPeerId:net.selfId,ownerName:app.identity.ownerName,name:app.identity.name,colors:app.identity.colors,mark:app.identity.mark,kind:app.identity.kind,templateId:app.identity.templateId,budget:Number(app.draft.purse),players:[],connected:true};app.game={version:2,roomCode:code,hostPeerId:net.selfId,phase:'lobby',settings:{maxTeams:Number(app.draft.maxTeams),squadSize:Number(app.draft.squadSize),purse:Number(app.draft.purse),timerSeconds:Number(app.draft.timerSeconds),overseasLimit:Number(app.draft.squadSize)>=18?7:6,hallOfFame:false},teams:[t],activity:[{id:uid(),text:`${t.ownerName} created the auction room.`,kind:'',at:Date.now()}],auction:null};app.route='lobby';app.pendingJoin=false;render();toast('Room created',`Invite friends with code ${code}.`,'ok')}catch(e){toast('Check your setup',e.message,'err')}
}
async function joinRoom(){
  try{app.identity=identityFromDraft();const code=app.draft.joinCode.trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))throw new Error('Enter the 6-character room code');app.pendingJoin=true;app.game=null;app.route='lobby';const net=await initNetwork(code);setTimeout(()=>{if(app.pendingJoin)net.send('join',app.identity)},700);setTimeout(()=>{if(app.pendingJoin)toast('Still looking for host','Check the code and make sure the host has the lobby open.','err')},7000)}catch(e){app.pendingJoin=false;toast('Could not join',e.message,'err')}
}
async function leaveRoom(){await closeNetwork();app.game=null;app.identity=null;app.pendingJoin=false;app.route='home';render()}

// UI events
document.addEventListener('input',e=>{const k=e.target?.dataset?.draft;if(k){let v=e.target.value;if(['maxTeams','squadSize','purse','timerSeconds'].includes(k))v=Number(v);app.draft[k]=v}});
document.addEventListener('change',e=>{const k=e.target?.dataset?.draft;if(k){let v=e.target.value;if(['maxTeams','squadSize','purse','timerSeconds'].includes(k))v=Number(v);app.draft[k]=v;if(app.route==='create'&&['maxTeams','squadSize','purse','timerSeconds'].includes(k))render()}const s=e.target?.dataset?.setting;if(s)command({type:'setting',key:s,value:Number(e.target.value)});if(e.target?.id==='xi-captain')command({type:'xi-role',role:'captain',playerId:e.target.value||null});if(e.target?.id==='xi-keeper')command({type:'xi-role',role:'wicketkeeper',playerId:e.target.value||null})});
document.addEventListener('submit',e=>{if(e.target.id==='create-form'){e.preventDefault();createRoom()}if(e.target.id==='join-form'){e.preventDefault();joinRoom()}});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
  if(a==='home'){if(app.game)return toast('Room is active','Use “Leave room” if you want to end this session.');app.route='home';render()}
  else if(a==='go-create'){app.route='create';render()}else if(a==='go-join'){app.route='join';render()}
  else if(a==='rules'){app.rules=true;render()}else if(a==='close-rules'){app.rules=false;render()}else if(a==='sound'){app.sound=!app.sound;render();if(app.sound)beep('bid')}
  else if(a==='team-mode'){app.draft.teamMode=b.dataset.mode;render()}else if(a==='pick-franchise'){app.draft.franchiseId=b.dataset.id;render()}else if(a==='pick-logo'){app.draft.logoId=b.dataset.id;render()}
  else if(a==='copy-room'){navigator.clipboard?.writeText(app.game.roomCode);toast('Invite code copied',app.game.roomCode,'ok')}
  else if(a==='start-auction'){command({type:'start'})}
  else if(a==='open-trades'){command({type:'open-trades'})}
  else if(a==='skip-trades'||a==='close-trades'){command({type:'start-xi'})}
  else if(a==='trade-propose'){const offer=$('#trade-offer')?.value,target=$('#trade-target')?.value;if(offer&&target){const [toTeamId,targetPlayerId]=target.split('::');command({type:'trade-propose',offerPlayerId:offer,toTeamId,targetPlayerId})}}
  else if(a==='trade-accept'){command({type:'trade-respond',tradeId:b.dataset.trade,accept:true})}
  else if(a==='trade-reject'){command({type:'trade-respond',tradeId:b.dataset.trade,accept:false})}
  else if(a==='xi-toggle'){command({type:'xi-toggle',playerId:b.dataset.player})}
  else if(a==='xi-auto'){command({type:'xi-auto'})}
  else if(a==='xi-lock'){command({type:'xi-lock'})}
  else if(a==='xi-autofill-all'){command({type:'xi-autofill-all'})}
  else if(a==='reveal-results'){command({type:'reveal-results'})}
  else if(a==='bid'){command({type:'bid'})}
  else if(a==='pass'){command({type:'pass'})}
  else if(a==='pause'){command({type:'pause'})}
  else if(a==='toggle-broadcast'){app.broadcastMode=!app.broadcastMode;render()}
  else if(a==='force-next'){command({type:'force-next'})}
  else if(a==='send-chat'){const input=$('#chat-input');const text=input?.value?.trim();if(text){command({type:'chat',text});input.value=''}}
  else if(a==='reaction'){command({type:'reaction',value:b.dataset.value})}
  else if(a==='story'){const t=app.game.teams.find(x=>x.id===b.dataset.team);if(t)drawStory(t)}
  else if(a==='csv'){downloadCsv()}
  else if(a==='download-newspaper'){drawNewspaper()}
  else if(a==='leave'){leaveRoom()}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target?.id==='chat-input'){e.preventDefault();document.querySelector('[data-action="send-chat"]')?.click()}if(e.code==='Space'&&app.route==='auction'&&!app.broadcastMode&&document.activeElement?.tagName!=='INPUT'){e.preventDefault();document.querySelector('[data-action="bid"]')?.click()}if((e.key==='b'||e.key==='B')&&app.route==='auction'&&document.activeElement?.tagName!=='INPUT'){app.broadcastMode=!app.broadcastMode;render()}});
window.addEventListener('beforeunload',()=>{try{app.network?.close?.()}catch{}});

render();
