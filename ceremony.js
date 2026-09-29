export function buildAwards(game, getPlayer, fmtPrice) {
  const sold = game.auction?.sold || [];
  const awards = [];
  if (sold.length) {
    const biggest = [...sold].sort((a,b)=>b.price-a.price)[0];
    const bp = getPlayer(biggest.playerId);
    const bt = game.teams.find(t=>t.id===biggest.teamId);
    awards.push({ icon:'💰', kicker:'BIGGEST BUY', title:bp?.name || '—', sub:`${bt?.name || '—'} · ${fmtPrice(biggest.price)}` });
    const value = [...sold].sort((a,b)=>{
      const pa=getPlayer(a.playerId), pb=getPlayer(b.playerId);
      return (pb?.rating||0)/(b.price+.25) - (pa?.rating||0)/(a.price+.25);
    })[0];
    const vp=getPlayer(value.playerId), vt=game.teams.find(t=>t.id===value.teamId);
    awards.push({ icon:'💎', kicker:'VALUE PICK', title:vp?.name || '—', sub:`${vt?.name || '—'} · ${fmtPrice(value.price)}`, note:'HammerXI rating divided by auction price' });
  }
  const maxEntry = obj => { const e=Object.entries(obj||{}); return e.length ? e.sort((a,b)=>b[1]-a[1])[0] : null; };
  const bid=maxEntry(game.stats?.bidCounts);
  if(bid){ const t=game.teams.find(x=>x.id===bid[0]); awards.push({ icon:'⚡', kicker:'BID WARRIOR', title:t?.name || '—', sub:`${bid[1]} accepted bids` }); }
  const bw=maxEntry(game.stats?.warWins);
  if(bw && bw[1]>0){ const t=game.teams.find(x=>x.id===bw[0]); awards.push({ icon:'🔥', kicker:'BIDDING WAR', title:t?.name || '—', sub:`${bw[1]} bidding-war win${bw[1]===1?'':'s'}` }); }
  const purse=[...game.teams].sort((a,b)=>b.budget-a.budget)[0];
  if(purse) awards.push({ icon:'🧠', kicker:'PURSE MASTER', title:purse.name, sub:`${fmtPrice(purse.budget)} left` });
  return awards;
}