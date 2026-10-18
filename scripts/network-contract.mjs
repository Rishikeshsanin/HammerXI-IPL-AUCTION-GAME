import { readFile } from 'node:fs/promises';
import { FRANCHISES, LOGO_PRESETS, PLAYERS, POOL_SIZE_BY_TEAMS, ROLE_LABEL } from '../data.js';

const ok=(condition,message)=>{if(!condition)throw new Error(message)};

const root={innerHTML:''};
const toastRoot={appendChild(){},innerHTML:''};
globalThis.document={
  activeElement:null,
  querySelector(selector){
    if(selector==='#app')return root;
    if(selector==='#toast-root')return toastRoot;
    return null;
  },
  addEventListener(){},
  createElement(){
    return {
      style:{},dataset:{},className:'',innerHTML:'',
      classList:{add(){},remove(){},toggle(){}},
      appendChild(){},remove(){},click(){},setAttribute(){},select(){}
    };
  }
};
globalThis.window={
  addEventListener(){},
  matchMedia(){return {matches:false,addEventListener(){}}},
  requestAnimationFrame(cb){cb();return 1},
  AudioContext:undefined,webkitAudioContext:undefined
};
globalThis.location={host:'qa.hammerxi.test',href:'https://qa.hammerxi.test/',search:'',hash:'',pathname:'/'};
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText(){}}},configurable:true});
globalThis.RTCPeerConnection=function RTCPeerConnection(){};
globalThis.WebSocket=function WebSocket(){};

let source=await readFile(new URL('../app.js',import.meta.url),'utf8');
source=source
  .replace(/^import .*?from '\.\/data\.js';\s*$/m,'')
  .replace(/^import .*?from 'trystero';\s*$/m,'')
  .replace(/\napplyInviteDeepLink\(\);\s*render\(\);\s*$/,'');

const sent=[];
let left=false;
const wire={
  onMessage:null,
  send(packet,options){sent.push({packet,options})}
};
const room={
  makeAction(name){ok(name==='wire','HammerXI must create the wire action');return wire},
  onPeerJoin:null,
  onPeerLeave:null,
  leave(){left=true}
};
const joinCalls=[];
const joinPeerRoom=(config,roomId,options)=>{
  joinCalls.push({config,roomId,options});
  return room;
};

const factory=new Function(
  'FRANCHISES','LOGO_PRESETS','PLAYERS','POOL_SIZE_BY_TEAMS','ROLE_LABEL','joinPeerRoom','peerSelfId',
  `${source}
  return {app,initNetwork,closeNetwork};`
);
const {app,initNetwork,closeNetwork}=factory(
  FRANCHISES,LOGO_PRESETS,PLAYERS,POOL_SIZE_BY_TEAMS,ROLE_LABEL,joinPeerRoom,'qa-self'
);

const net=await initNetwork('ABC234');
ok(joinCalls.length===1,'joinRoom must be called exactly once');
ok(joinCalls[0].config?.appId==='hammerxi-auction-night-v2','Trystero appId contract changed');
ok(joinCalls[0].roomId==='ABC234','Trystero room ID contract changed');
ok(typeof joinCalls[0].options?.onJoinError==='function','Trystero onJoinError callback missing');
ok(net.kind==='p2p','Supported Trystero path must stay P2P');
ok(net.selfId==='qa-self','Trystero selfId must flow into HammerXI');
ok(typeof wire.onMessage==='function','makeAction().onMessage handler must be registered');
ok(typeof room.onPeerJoin==='function','room.onPeerJoin callback must be registered');
ok(typeof room.onPeerLeave==='function','room.onPeerLeave callback must be registered');

net.send('probe',{ok:true},'peer-7');
ok(sent.length===1,'Network send must call Trystero action send');
ok(sent[0].packet?.type==='probe','Wire packet type contract changed');
ok(sent[0].packet?.payload?.ok===true,'Wire packet payload contract changed');
ok(sent[0].options?.target==='peer-7','Targeted Trystero send contract changed');

await closeNetwork();
ok(left===true,'Closing HammerXI network must leave Trystero room');
ok(app.network===null,'Closing network must clear runtime network state');

console.log('HammerXI Trystero contract PASS');
