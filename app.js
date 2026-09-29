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
<div class="field"><label 