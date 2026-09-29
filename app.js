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
  const feed=g.activity.slice(-26).reverse().map(e=>`<div class="feed-item ${e.kind||''}">${esc(e.text)}</div>`).join('');
  const role=ROLE_LABEL[p.role]; const pct=100;
  return `${header()}<main class="auction-shell"><aside class="auction-col left card auction-side"><div class="row-between"><div class="section-label">Franchise board</div><span class="mini-pill">${g.teams.length}</span></div>${teams}<div style="height:12px"></div><div class="section-label">My squad</div><div class="my-squad">${mine||'<div class="empty" style="padding:14px;font-size:11px">No buys yet.</div>'}</div></aside>
  <section class="auction-col card auction-main"><div class="auction-stage"><div class="stage-top"><div><div class="live-dot">LIVE AUCTION FLOOR</div><div class="lot-tag" style="margin-top:7px">${esc(lot.setLabel)} · LOT ${a.index+1}/${a.queue.length}${a.round===2?' · RECALL':''}</div></div><div class="timer" id="timer" style="--pct:${pct}"><span id="timer-text">${g.settings.timerSeconds}</span></div></div>
  <div class="player-stage"><div class="player-visual"><span class="origin-tag">${p.originalTeam} · ${p.overseas?'OVERSEAS':'INDIA'}</span><div class="player-initials">${initials(p.name)}</div><div><div class="role">${role}</div><div class="tiny muted" style="margin-top:4px">Game reserve ${fmtPrice(p.basePrice)}</div></div></div>
  <div class="player-copy"><div class="player-tags"><span class="tag">${role}</span><span class="tag">${p.overseas?'Overseas':'Indian'}</span><span class="tag">Rating ${p.rating}</span></div><h1>${esc(p.name)}</h1><div class="bid-block"><div class="bid-caption">${lead?'Current bid':'Reserve price'}</div><div class="big-price">${fmtPrice(a.currentBid)}</div><div class="leader-name">${lead?`Highest: <strong>${esc(lead.name)}</strong>`:'Waiting for the opening bid'}</div>
  <div class="bid-actions"><button class="bid-btn" data-action="bid" ${!can||a.status!=='live'?'disabled':''}>${lead?`BID ${fmtPrice(next)}`:`OPEN AT ${fmtPrice(next)}`}</button><button class="pass-btn" data-action="pass" ${passed||a.status!=='live'?'disabled':''}>${passed?'PASSED':'PASS'}</button></div><div class="reason">${can?`Next increment: ${fmtPrice(incrementFor(a.currentBid))} · Max safe bid ${fmtPrice(maxAllowedBid(me,g.settings))}`:esc(reason)}</div></div></div></div>
  ${a.status==='sold'?`<div class="sold-overlay"><div class="hammer-card"><div class="hammer-word">SOLD</div><div class="hammer-sub">${esc(p.name)} → ${esc(g.teams.find(t=>t.id===a.resolution.teamId)?.name||'')}</div><div class="hammer-price">${fmtPrice(a.resolution.price)}</div></div></div>`:''}
  ${a.status==='unsold'?`<div class="sold-overlay"><div class="hammer-card"><div class="hammer-word unsold">UNSOLD</div><div class="hammer-sub">${esc(p.name)} goes to ${a.round===1?'the recall list':'the archives'}</div></div></div>`:''}
  </div><div class="auction-mobile-stats"><div class="metric"><span>Purse</span><strong>${fmtPrice(me?.budget||0)}</strong></div><div class="metric"><span>Squad</span><strong>${me?.players.length||0}/${g.settings.squadSize}</strong></div><div class="metric"><span>Overseas</span><strong>${overseasCount(me||{players:[]})}/${g.settings.overseasLimit}</strong></div></div></section>
  <aside class="auction-col right card auction-side"><div class="section-label">Room activity</div><div class="feed" id="feed">${feed||'<div class="feed-item">Auction activity will appear here.</div>'}</div><div class="chat-box"><input class="input" id="chat-input" maxlength="70" placeholder="Auction chat… keep it clean"><button class="icon-btn" data-action="send-chat">↗</button></div><div class="reactions"><button class="reaction" data-action="reaction" data-value="🔥">🔥</button><button class="reaction" data-action="reaction" data-value="😂">😂</button><button class="reaction" data-action="reaction" data-value="💀">💀</button><button class="reaction" data-action="reaction" data-value="👏">👏</button></div><div style="height:18px"></div><div class="section-label">Auction control</div>${amHost()?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px"><button class="btn small secondary" data-action="pause">${a.paused?'Resume':'Pause'}</button><button class="btn small ghost" data-action="force-next">Skip lot</button></div>`:`<div class="small-copy muted">Host controls the hammer and auction flow.</div>`}<div class="summary-block"><span>Pool</span><strong>${a.queue.length} lots</strong></div><div class="summary-block"><span>Sold</span><strong>${a.sold.length}</strong></div><div class="summary-block"><span>Recall</span><strong>${a.round===2?'Active':`${a.unsold.length} waiting`}</strong></div></aside></main>`;
}

function bestBuy(team){if(!team.players.length)return null;return [...team.players].sort((a,b)=>{const pa=byId(a.playerId),pb=byId(b.playerId);return (pb.rating/(b.price+.25))-(pa.rating/(a.price+.25))})[0]}
function renderResults(){
  const g=app.game,me=getMyTeam();
  const cards=g.teams.map(t=>{const spent=round2(g.settings.purse-t.budget),bb=bestBuy(t),[a,b]=colorsForTeam(t);return `<article class="card result-team" style="--team-a:${a};--team-b:${b}"><div class="result-head">${crest(t,'lg')}<div class="copy"><h3>${esc(t.name)}</h3><p>${esc(t.ownerName)} · ${t.players.length} players</p></div>${t.id===me?.id?'<span class="host-badge">YOUR TEAM</span>':''}</div><div class="result-metrics"><div class="metric"><span>Spent</span><strong>${fmtPrice(spent)}</strong></div><div class="metric"><span>Left</span><strong>${fmtPrice(t.budget)}</strong></div><div class="metric"><span>Overseas</span><strong>${overseasCount(t)}</strong></div></div><div class="players-cloud">${t.players.slice().sort((x,y)=>y.price-x.price).map(x=>`<span class="player-chip">${esc(byId(x.playerId)?.name)} · ${fmtPrice(x.price)}</span>`).join('')||'<span class="muted tiny">No purchases</span>'}</div>${bb?`<div class="rule-note" style="margin-top:12px">Value pick: <strong>${esc(byId(bb.playerId)?.name)}</strong> at ${fmtPrice(bb.price)} — based on HammerXI rating ÷ auction price.</div>`:''}<div class="result-actions"><button class="btn small primary" data-action="story" data-team="${t.id}">Download story card</button></div></article>`}).join('');
  return `${header()}<div class="results-layout"><section class="card result-hero"><div><div class="eyebrow">Auction complete</div><h1 class="setup-title" style="font-size:38px;margin-top:8px">The squads are locked.</h1><p class="muted">Nothing is saved on a HammerXI account. Download what you want before you leave.</p></div><div class="result-actions"><button class="btn secondary" data-action="csv">Download auction CSV</button><button class="btn ghost" data-action="leave">Leave room</button></div></section><div class="result-grid">${cards}</div></div>${footer()}`;
}

function rulesModal(){if(!app.rules)return '';return `<div class="modal-backdrop" data-action="close-rules"><div class="modal card" onclick="event.stopPropagation()"><div class="row-between"><div><div class="eyebrow">HammerXI rules</div><h2>Fast enough for friends. Strict enough to feel real.</h2></div><button class="icon-btn" data-action="close-rules">×</button></div><div class="rules-list">
${[
['Squads','2–10 franchises. Host selects 15–20 squad spots; the default is 18. Overseas cap is 6 for smaller squads and 7 for squads of 18–20.'],
['Purse','₹125 Cr is the 2026-inspired default purse. HammerXI also offers ₹100 Cr and ₹150 Cr casual presets.'],
['Player pool','Automatically scales with the number of teams that actually start: 50 players for 2 teams, up to 235 for 10.'],
['Reserve prices','Reserve tiers use ₹30L, ₹40L, ₹50L, ₹75L, ₹1 Cr, ₹1.25 Cr, ₹1.5 Cr and ₹2 Cr, mirroring the 2026 auction ladder while player placement in those bands remains a HammerXI game rating.'],
['Bid increments','₹5L below ₹1 Cr; ₹10L from ₹1–2 Cr; ₹20L from ₹2–5 Cr; ₹25L above ₹5 Cr.'],
['Purse protection','A bid is blocked if it would leave less than ₹30L for each remaining mandatory squad slot.'],
['Pass & hammer','Passing locks you out for that player. If all eligible rivals pass, the host resolves the lot immediately. Otherwise the live clock decides.'],
['Recall round','Unsold players receive one accelerated recall round if at least one franchise still has an open squad slot.'],
['Privacy','No login, no profile database, no saved auction history. Live data sits in the connected browsers and disappears when the room ends.']
].map((x,i)=>`<div class="rule-item"><div class="rule-num">${i+1}</div><div><strong>${x[0]}</strong><p>${x[1]}</p></div></div>`).join('')}</div><button class="btn primary" data-action="close-rules" style="width:100%;margin-top:20px">Got it</button></div></div>`}
function render(){
  const root=$('#app');
  const page=app.route==='home'?renderHome():app.route==='create'?renderCreate():app.route==='join'?renderJoin():app.route==='lobby'?renderLobby():app.route==='auction'?renderAuction():app.route==='results'?renderResults():renderHome();
  root.innerHTML=`<div class="shell">${page}</div>${rulesModal()}`;
  if(app.route==='auction')updateTimerDom();
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
    const mod=await Promise.race([import('https://esm.run/trystero'),new Promise((_,rej)=>setTimeout(()=>rej(new Error('P2P module timeout')),8500))]);
    const selfId=mod.selfId; const room=mod.joinRoom({appId:'hammerxi-auction-night-v1',password:`hx-${code}`},code); const wire=room.makeAction('wire'); const peers=new Set();
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
    toast('P2P network unavailable','Using same-browser local fallback for testing.','err');
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
  const team=app.game.teams.find(t=>t.ownerPeerId===peerId);
  if(cmd.type==='setting')return applySetting(peerId,cmd);
  if(cmd.type==='start')return startAuction(peerId);
  if(cmd.type==='chat'){const text=String(cmd.text||'').trim().slice(0,70);if(text&&team){addActivity(`${team.ownerName}: ${text}`,'');broadcast()}return}
  if(cmd.type==='reaction'){if(team){addActivity(`${team.ownerName} reacted ${String(cmd.value||'').slice(0,4)}`);broadcast()}return}
  if(app.game.phase!=='auction'||!team)return;
  if(cmd.type==='bid')placeBid(peerId,team);else if(cmd.type==='pass')passLot(peerId,team);else if(cmd.type==='pause'&&peerId===app.game.hostPeerId)togglePause();else if(cmd.type==='force-next'&&peerId===app.game.hostPeerId){app.game.auction.highestTeamId?resolveSold():resolveUnsold(true)};
}
function command(cmd){if(!app.game||!app.network)return;if(amHost())handleCommand(app.network.selfId,cmd);else app.network.send('cmd',cmd,app.game.hostPeerId)}
function applySetting(peerId,cmd){
  const g=app.game;if(peerId!==g.hostPeerId||g.phase!=='lobby')return;const key=cmd.key;let value=Number(cmd.value);
  if(key==='maxTeams')value=clamp(value,Math.max(2,g.teams.length),10); else if(key==='squadSize')value=clamp(value,15,20);else if(key==='purse'&&!([100,125,150].includes(value)))return;else if(key==='timerSeconds'&&!([8,10,12,15,20].includes(value)))return;else if(!['maxTeams','squadSize','purse','timerSeconds'].includes(key))return;
  g.settings[key]=value;g.settings.overseasLimit=g.settings.squadSize>=18?7:6;if(key==='purse')g.teams.forEach(t=>{if(!t.players.length)t.budget=value});broadcast();
}
function buildPool(count,seed){
  const n=POOL_SIZE_BY_TEAMS[clamp(count,2,10)]; const ranked=[...PLAYERS].sort((a,b)=>b.rating-a.rating||a.name.localeCompare(b.name)); const top=ranked.slice(0,12); const rest=ranked.slice(12); const bands=[];
  for(let i=0;i<rest.length;i+=20)bands.push(...shuffle(rest.slice(i,i+20),`${seed}-${i}`));return [...top,...bands].slice(0,n);
}
function buildQueue(pool,seed){
  const marquee=shuffle([...pool].sort((a,b)=>b.rating-a.rating).slice(0,12),`${seed}-marquee`).map(p=>({playerId:p.id,setLabel:'Marquee'}));
  const rem=pool.filter(p=>!marquee.some(m=>m.playerId===p.id)); const labels={BAT:'Batters',AR:'All-Rounders',WK:'Wicketkeepers',BOWL:'Bowlers'}; const roles=['BAT','AR','WK','BOWL']; const queues=roles.map(r=>shuffle(rem.filter(p=>p.role===r),`${seed}-${r}`)); const out=[...marquee];
  le