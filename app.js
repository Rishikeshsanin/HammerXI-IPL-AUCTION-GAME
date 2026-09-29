import { FRANCHISES, LOGO_PRESETS, PLAYERS, POOL_SIZE_BY_TEAMS, ROLE_LABEL } from './data.js';

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
  hostClock:null, timerClock:null, advanceTimer:null
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
    o.connect(g);g.connect(ctx.destination); const now=ctx.currentTime;
    o.type=kind==='sold'?'triangle':'sine';o.frequency.setValueAtTime(kind==='sold'?180:kind==='error'?110:420,now);
    if(kind==='sold')o.frequency.exponentialRampToValueAtTime(75,now+.18);else o.frequency.exponentialRampToValueAtTime(kind==='bid'?630:80,now+.11);
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.08,now+.01);g.gain.exponentialRampToValueAtTime(.0001,now+.22);
    o.start(now);o.stop(now+.24);setTimeout(()=>ctx.close(),400);
  }catch{}
}

function header(){
  const status= app.networkStatus==='online' ? ['Live P2P',''] : app.networkStatus==='local' ? ['Local fallback','warn'] : ['No room','off'];
  return `<header class="topbar">
    <button class="brand" data-action="home" style="background:none;border:0;color:inherit;padding:0"><span class="brand-mark"><span>H</span></span>HAMMER<span style="color:var(--accent)">XI</span></button>
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
  <div class="setting-row"><label>Bid clock</label><select class="select" data-setting="timerSeconds" ${amHost()?'':'disabled'}>${opts([8,10,12,15,20],'timerSeconds','s')}</select></div></div>
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
function renderScoreTeam(t,me,g){return `<div class="score-team ${t.id===me?.id?'me':''} ${g.auction.highestTeamId===t.id?'leading':''}">${crest(t,'sm')}<div class="meta"><strong>${esc(t.name)}</strong><span>${t.players.length}/${g.settings.squadSize} · ${overseasCount(t)}/${g.settings.overseasLimit} OS</span></div><div class="money">${fmtPrice(t.budget)}</div></div>`}
function renderAuction(){
  const g=app.game,p=currentPlayer(g),lot=currentLot(g),me=getMyTeam();if(!p||!lot)return renderLobby();
  const a=g.auction,lead=g.teams.find(t=>t.id===a.highestTeamId),next=nextBidAmount(a,p),[can,reason]=canTeamBid(me,p,next,g); const passed=a.passedTeamIds.includes(me?.id);
  const teams=g.teams.map(t=>renderScoreTeam(t,me,g)).join('');
  const mine=me?.players.slice().reverse().map(x=>`<div class="squad-mini"><strong>${esc(byId(x.playerId)?.name||'Player')}</strong><span>${fmtPrice(x.price)}</span></div>`).join('')||'';
  const feed=g.