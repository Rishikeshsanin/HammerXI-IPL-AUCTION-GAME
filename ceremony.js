const moneyToCr = text => {
  const s=String(text||'').replace(/[₹,]/g,'').trim();
  const n=parseFloat(s)||0;
  return /L/i.test(s) ? n/100 : n;
};

function metric(card,label){
  const nodes=[...card.querySelectorAll('.metric')];
  const m=nodes.find(x=>x.querySelector('span')?.textContent.trim().toLowerCase()===label.toLowerCase());
  return m?.querySelector('strong')?.textContent.trim() || '';
}

function buildCeremony(layout){
  if(layout.querySelector('.ceremony')) return;
  const teams=[...layout.querySelectorAll('.result-team')];
  if(!teams.length) return;
  const info=teams.map(card=>({
    card,
    team:card.querySelector('.result-head h3')?.textContent.trim() || 'Franchise',
    owner:card.querySelector('.result-head p')?.textContent.split('·')[0]?.trim() || '',
    spent:moneyToCr(metric(card,'Spent')),
    left:moneyToCr(metric(card,'Left')),
    players:[...card.querySelectorAll('.player-chip')].map(x=>x.textContent.trim())
  }));
  const buys=info.flatMap(t=>t.players.map(text=>{
    const parts=text.split('·');
    return {team:t.team,player:(parts[0]||'Player').trim(),price:moneyToCr(parts.slice(1).join('·'))};
  })).filter(x=>x.price>0);
  const biggest=buys.sort((a,b)=>b.price-a.price)[0];
  const smallest=[...buys].sort((a,b)=>a.price-b.price)[0];
  const spender=[...info].sort((a,b)=>b.spent-a.spent)[0];
  const saver=[...info].sort((a,b)=>b.left-a.left)[0];
  const awards=[
    biggest && {icon:'💰',kicker:'BIGGEST BUY',title:biggest.player,sub:`${biggest.team} · ₹${biggest.price.toFixed(2)} Cr`},
    spender && {icon:'⚡',kicker:'BIG SPENDER',title:spender.team,sub:`₹${spender.spent.toFixed(2)} Cr spent`},
    saver && {icon:'🧠',kicker:'PURSE MASTER',title:saver.team,sub:`₹${saver.left.toFixed(2)} Cr left`},
    smallest && {icon:'💎',kicker:'LOWEST PRICE BUY',title:smallest.player,sub:`${smallest.team} · ₹${smallest.price.toFixed(2)} Cr`}
  ].filter(Boolean);
  const el=document.createElement('section');
  el.className='card ceremony';
  const confetti=Array.from({length:14},(_,i)=>`<i style="--i:${i}"></i>`).join('');
  el.innerHTML=`<div class="ceremony-confetti" aria-hidden="true">${confetti}</div><div class="ceremony-copy"><div class="eyebrow">HAMMERXI AUCTION NIGHT</div><h1>AUCTION AWARDS</h1><p>The biggest moments from this auction room.</p></div><div class="ceremony-grid">${awards.map((a,i)=>`<article class="award-card" style="--delay:${i*70}ms"><span class="award-icon">${a.icon}</span><div class="award-kicker">${a.kicker}</div><strong>${a.title}</strong><span>${a.sub}</span></article>`).join('')}</div><div class="ceremony-foot">Calculated locally from the final auction results.</div>`;
  layout.prepend(el);
}

function scan(){
  const layout=document.querySelector('.results-layout');
  if(layout) buildCeremony(layout);
}

new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});
scan();