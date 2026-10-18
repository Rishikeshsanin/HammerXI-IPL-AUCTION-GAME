import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root=normalize(join(process.cwd(),'dist'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/', 'http://127.0.0.1');
    let pathname=decodeURIComponent(url.pathname);
    if(pathname==='/'||!extname(pathname))pathname='/index.html';
    const file=normalize(join(root,pathname.replace(/^\/+/,'')));
    if(!file.startsWith(root)){res.writeHead(403);res.end('Forbidden');return}
    const info=await stat(file);
    if(!info.isFile())throw new Error('not file');
    const body=await readFile(file);
    res.writeHead(200,{
      'content-type':mime[extname(file)]||'application/octet-stream',
      'cache-control':'no-store',
      'cross-origin-resource-policy':'cross-origin'
    });
    res.end(body);
  }catch{
    res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Not found');
  }
});
const port=Number(process.env.PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log(`HammerXI test server http://127.0.0.1:${port}`));
