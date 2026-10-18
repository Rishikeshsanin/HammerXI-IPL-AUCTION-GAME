import { readFile } from 'node:fs/promises';

const [html,css,app]=await Promise.all([
  readFile('index.html','utf8'),
  readFile('styles.css','utf8'),
  readFile('app.js','utf8')
]);
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/name=["']viewport["'][^>]*width=device-width/i.test(html),'Responsive viewport meta tag missing');
must(css.includes('@media(max-width:760px)'),'760px mobile breakpoint missing');
must(css.includes('@media(max-width:360px)'),'360px narrow-phone breakpoint missing');
must(/@media\(max-width:760px\)[\s\S]*font-size:16px/.test(css),'Mobile 16px form-control guard missing');
must(/@media\(max-width:760px\)[\s\S]*min-height:44px/.test(css),'Mobile 44px touch-target guard missing');
must(css.includes('.auction-col.left{display:none}')||/@media\(max-width:760px\)[\s\S]*\.auction-col\.left\{display:none\}/.test(css),'Mobile must hide desktop left auction rail');
must(css.includes('.mobile-private-squad{display:block'),'Mobile private squad panel must remain available');
must(app.includes("squadPanelOpen:!(typeof window!=='undefined'&&window.matchMedia?.('(max-width:760px)')?.matches)"),'Mobile squad panel should default collapsed');
must(app.includes('function scheduleRender()'),'Coalesced render path missing');

console.log('HammerXI mobile verification PASS');
