import { test, expect } from '@playwright/test';

const mobileWidths=[320,360,375,390,412,430];

async function prepareContext(browser){
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>{
    // Force HammerXI's deterministic same-browser fallback so CI can create a
    // real multi-tab room without depending on public signalling/NAT behavior.
    try{Object.defineProperty(window,'RTCPeerConnection',{value:undefined,configurable:true,writable:true})}catch{}
  });
  await context.route('https://en.wikipedia.org/**',async route=>{
    if(route.request().url().includes('/w/api.php')){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({query:{pages:{'-1':{ns:0,title:'QA',missing:''}}}})});
    }else await route.abort();
  });
  await context.route('https://upload.wikimedia.org/**',route=>route.abort());
  return context;
}

async function createHost(page){
  await page.goto('/');
  await page.locator('[data-action="go-create"]').click();
  await page.locator('[data-action="team-mode"][data-mode="custom"]').click();
  await page.locator('#ownerName').fill('QA Host');
  await page.locator('#customName').fill('Hammer Host XI');
  await page.locator('[data-draft="maxTeams"]').selectOption('10');
  await page.locator('[data-draft="squadSize"]').selectOption('20');
  await page.locator('[data-draft="purse"]').selectOption('150');
  await page.locator('[data-draft="timerSeconds"]').selectOption('20');
  await page.locator('#create-form button[type="submit"]').click();
  await expect(page.locator('.room-code')).toBeVisible();
  await expect(page.locator('.mini-pill')).toContainText('Local test transport');
  return (await page.locator('.room-code').textContent()).trim();
}

async function joinGuest(page,code,index){
  await page.goto('/?room='+code);
  await page.locator('[data-action="team-mode"][data-mode="custom"]').click();
  await page.locator('[data-draft="ownerName"]').fill(`QA Guest ${index}`);
  await page.locator('#customName').fill(`Guest XI ${index}`);
  await page.locator('#join-form button[type="submit"]').click();
  await expect(page.locator('.room-code')).toHaveText(code,{timeout:12_000});
  await expect(page.locator('.team-row.me')).toBeVisible();
}

async function assertNoHorizontalOverflow(page){
  const result=await page.evaluate(()=>({
    innerWidth:window.innerWidth,
    scrollWidth:document.documentElement.scrollWidth,
    bodyWidth:document.body.scrollWidth
  }));
  expect(result.scrollWidth,'document horizontal overflow').toBeLessThanOrEqual(result.innerWidth+2);
  expect(result.bodyWidth,'body horizontal overflow').toBeLessThanOrEqual(result.innerWidth+2);
}

async function assertControlInsideViewport(page,selector){
  const box=await page.locator(selector).boundingBox();
  expect(box,`${selector} must exist`).not.toBeNull();
  const width=await page.evaluate(()=>window.innerWidth);
  expect(box.x,`${selector} left edge`).toBeGreaterThanOrEqual(-1);
  expect(box.x+box.width,`${selector} right edge`).toBeLessThanOrEqual(width+2);
  expect(box.height,`${selector} touch height`).toBeGreaterThanOrEqual(43);
}

test('mobile route matrix has no horizontal overflow or iOS-hostile controls',async({browser})=>{
  const context=await prepareContext(browser);
  const page=await context.newPage();
  for(const width of mobileWidths){
    await page.setViewportSize({width,height:844});
    await page.goto('/');
    await assertNoHorizontalOverflow(page);
    await page.locator('[data-action="go-create"]').click();
    await assertNoHorizontalOverflow(page);
    const inputFont=await page.locator('#ownerName').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
    expect(inputFont,`${width}px input font`).toBeGreaterThanOrEqual(16);
    const submit=page.locator('#create-form button[type="submit"]');
    const submitBox=await submit.boundingBox();
    expect(submitBox.height,`${width}px create touch target`).toBeGreaterThanOrEqual(43);
    await page.locator('[data-action="home"]').click();
  }
  await context.close();
});

test('10-team auction survives rapid realtime traffic and mixed phone widths',async({browser})=>{
  const context=await prepareContext(browser);
  const host=await context.newPage();
  await host.setViewportSize({width:1440,height:900});
  const code=await createHost(host);

  const viewportMatrix=[
    {width:390,height:844},
    {width:320,height:780},
    {width:360,height:800},
    {width:430,height:900},
    {width:375,height:812},
    {width:412,height:915},
    {width:768,height:1024},
    {width:1024,height:900},
    {width:1280,height:900}
  ];
  const guests=[];
  for(let i=1;i<=9;i++){
    const page=await context.newPage();
    await page.setViewportSize(viewportMatrix[i-1]);
    guests.push(page);
    await joinGuest(page,code,i);
    await expect(host.locator('.lobby-main .small-copy')).toContainText(`${i+1} joined`);
  }

  await expect(host.locator('[data-action="start-auction"]')).toBeEnabled();
  await host.locator('[data-action="start-auction"]').click();
  for(const page of [host,...guests]){
    await expect(page.locator('[data-action="bid"]')).toBeVisible({timeout:10_000});
  }

  const initialPlayer=(await host.locator('.player-copy h1').textContent()).trim();
  for(const page of guests){
    await expect(page.locator('.player-copy h1')).toHaveText(initialPlayer);
  }

  // Mobile DOM should not build hidden desktop rails.
  for(let i=0;i<6;i++){
    const page=guests[i];
    expect(await page.locator('.auction-col.left').count(),`guest ${i+1} hidden left rail`).toBe(0);
    expect(await page.locator('.auction-col.right').count(),`guest ${i+1} hidden right rail`).toBe(0);
    await assertNoHorizontalOverflow(page);
    await assertControlInsideViewport(page,'[data-action="bid"]');
    await assertControlInsideViewport(page,'[data-action="pass"]');
    await assertControlInsideViewport(page,'[data-action="quick-bid"][data-raise="0.5"]');
    await assertControlInsideViewport(page,'[data-action="quick-bid"][data-raise="1"]');
    await expect(page.locator('.mobile-private-squad')).toContainText('LIVE SQUAD NEEDS');
  }

  // An unsent host chat draft must survive a guest bid and keep focus.
  const chat=host.locator('#chat-input');
  await chat.fill('draft survives realtime render');
  await chat.focus();
  await guests[0].locator('[data-action="bid"]').click();
  await expect(chat).toHaveValue('draft survives realtime render');
  expect(await host.evaluate(()=>document.activeElement?.id)).toBe('chat-input');
  await chat.fill('');

  // Exercise both fast-bid shortcuts before the rapid normal-bid loop.
  await expect(host.locator('[data-action="quick-bid"][data-raise="0.5"]')).toBeEnabled();
  await host.locator('[data-action="quick-bid"][data-raise="0.5"]').click();
  await expect(guests[0].locator('[data-action="quick-bid"][data-raise="1"]')).toBeEnabled();
  await guests[0].locator('[data-action="quick-bid"][data-raise="1"]').click();

  const started=Date.now();
  for(let i=0;i<30;i++){
    const bidder=i%2===0?host:guests[0];
    await expect(bidder.locator('[data-action="bid"]')).toBeEnabled();
    await bidder.locator('[data-action="bid"]').click();
  }
  expect(Date.now()-started,'30 alternating realtime bids').toBeLessThan(25_000);

  const price=(await host.locator('.big-price').textContent()).trim();
  const player=(await host.locator('.player-copy h1').textContent()).trim();
  for(const page of guests){
    await expect(page.locator('.big-price')).toHaveText(price);
    await expect(page.locator('.player-copy h1')).toHaveText(player);
  }

  // PASS/UNDO is repeatedly reversible without pausing the auction.
  for(let i=0;i<5;i++){
    const pass=guests[1].locator('[data-action="pass"]');
    await expect(pass).toBeEnabled();
    await pass.click();
    await expect(pass).toHaveText('UNDO PASS');
    await pass.click();
    await expect(pass).toHaveText('PASS');
  }
  await expect(host.locator('.paused-banner')).toHaveCount(0);

  // Host pause must become visible on every client and resume cleanly.
  await host.locator('[data-action="pause"]').click();
  for(const page of [host,...guests])await expect(page.locator('.paused-banner')).toBeVisible();
  await expect(guests[2].locator('#timer-text')).toHaveText('Ⅱ');
  await host.locator('[data-action="pause"]').click();
  for(const page of [host,...guests])await expect(page.locator('.paused-banner')).toHaveCount(0);

  // Activity/chat must propagate without moving the auction state.
  const desktopGuest=guests[8];
  await desktopGuest.locator('#chat-input').fill('ten-seat endurance message');
  await desktopGuest.locator('#chat-input').press('Enter');
  await expect(host.locator('#feed')).toContainText('ten-seat endurance message');

  // Force the current lot SOLD, validate mobile SOLD layout and private squad update.
  const soldPlayer=(await host.locator('.player-copy h1').textContent()).trim();
  await host.locator('[data-action="force-next"]').click();
  for(const page of [host,guests[0],guests[1]])await expect(page.locator('.sold-overlay')).toBeVisible();
  await expect(guests[0].locator('.my-squad-panel')).toContainText(soldPlayer);
  for(let i=0;i<6;i++)await assertNoHorizontalOverflow(guests[i]);

  // Automatic advance followed by the host Previous Player rollback.
  await expect(host.locator('.player-copy h1')).not.toHaveText(soldPlayer,{timeout:7_000});
  await expect(host.locator('[data-action="previous-lot"]')).toBeEnabled();
  await host.locator('[data-action="previous-lot"]').click();
  await expect(host.locator('.player-copy h1')).toHaveText(soldPlayer);
  for(const page of guests)await expect(page.locator('.player-copy h1')).toHaveText(soldPlayer);
  await expect(guests[0].locator('.my-squad-panel')).not.toContainText(soldPlayer);

  const finalPrice=(await host.locator('.big-price').textContent()).trim();
  for(const page of guests)await expect(page.locator('.big-price')).toHaveText(finalPrice);

  await context.close();
});
