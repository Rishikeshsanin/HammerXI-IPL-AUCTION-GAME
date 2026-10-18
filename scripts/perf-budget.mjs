import { stat } from 'node:fs/promises';

const limits={
  'dist/app.js':220*1024,
  'dist/styles.css':90*1024,
  'dist/ceremony.js':40*1024,
  'dist/index.html':16*1024
};
let total=0;
for(const [path,limit] of Object.entries(limits)){
  const s=await stat(path);total+=s.size;
  if(s.size>limit)throw new Error(`${path} exceeds performance budget: ${s.size} > ${limit} bytes`);
  console.log(`${path}: ${s.size} bytes / ${limit} budget`);
}
const totalLimit=350*1024;
if(total>totalLimit)throw new Error(`Critical static bundle exceeds budget: ${total} > ${totalLimit} bytes`);
console.log('HammerXI production performance budget PASS',{totalBytes:total,totalLimit});
