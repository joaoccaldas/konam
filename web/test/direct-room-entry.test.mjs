import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/landing.js',import.meta.url),'utf8');
const enter=source.slice(source.indexOf('function enter({gallery='),source.indexOf("if ($('enterBtn')"));
test('every deep-link room bypasses the saved room and routes once without a timer',()=>{
  for(const room of ['hall','pier','kona','sanctuary','hween','nike-running','breitling','nave','bay-nice','room-alien','atlas-kona-light-bay']) {
    const calls=[],timers=[],P={x:0,z:0},passport={visits:5,pose:{region:'pier',x:45,z:48}};
    const el={classList:{add(){}},focus(){},getAttribute(){return 'true';}};
    const context={URLSearchParams,location:{search:'?room='+room},started:false,document:{body:el},$:()=>el,coarse:false,passport,P,walkable:()=>true,applyStoredEvent(){},writePassport(){},haptic(){},coach(){},profile:{get:()=>({sound:false})},toast(){},canvas:el,window:{__museumGo:(id,opts)=>calls.push({id,opts})},setTimeout:(...v)=>timers.push(v)};
    vm.runInNewContext(enter+'\nenter();',context);
    assert.equal(P.x,0,'saved pose must not be applied');
    assert.equal(calls.length,1);assert.equal(calls[0].id,room);assert.equal(calls[0].opts.instant,true);assert.equal(timers.length,0);
  }
});
test('ordinary entry keeps the existing returning-visitor behavior',()=>{
 const P={},el={classList:{add(){}},focus(){},getAttribute(){return 'true';}};
 const c={URLSearchParams,location:{search:''},started:false,document:{body:el},$:()=>el,coarse:false,passport:{visits:2,pose:{region:'pier',x:3,z:4}},P,walkable:()=>true,applyStoredEvent(){},writePassport(){},haptic(){},coach(){},passportProgress:()=>({seen:1,total:10}),profile:{get:()=>({sound:false})},toast(){},canvas:el,window:{},setTimeout(){throw Error('unexpected timer');}};
 vm.runInNewContext(enter+'\nenter();',c);assert.equal(P.x,3);assert.equal(P.z,4);
});

test('the frame loop does no drawing before source entry owns its camera',()=>{
 const head=source.slice(source.indexOf('function frame(now)'),source.indexOf('  const dt =',source.indexOf('function frame(now)')));
 let draws=0,queued=0;const c={started:false,last:0,document:{hidden:false,body:{classList:{contains:()=>false}}},requestAnimationFrame(){queued++;}};
 vm.runInNewContext(head+'draw();}\nframe(123);',{...c,draw(){draws++;}});assert.equal(draws,0);assert.equal(queued,1);
});
