import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const tokens=fs.readFileSync(new URL('../../brand/tokens.css',import.meta.url),'utf8');
const themes=fs.readFileSync(new URL('../../brand/themes.css',import.meta.url),'utf8');

const hex=(css,name)=>{
  const m=css.match(new RegExp('--'+name+'\\s*:\\s*(#[0-9a-fA-F]{6})'));
  assert.ok(m,'missing literal color '+name);
  return m[1];
};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const luminance=h=>{
  const [r,g,b]=rgb(h).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b;
};
const contrast=(a,b)=>{
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};

test('bright KONA actions use dark brand text',()=>{
  assert.match(tokens,/--brand-on-action\s*:\s*var\(--brand-lava\)/);
  assert.match(tokens,/--brand-on-accent\s*:\s*var\(--brand-lava\)/);
  const dark=hex(tokens,'brand-lava');
  for(const name of ['brand-sunrise','brand-ember','brand-ocean','brand-hibiscus','brand-lilac','brand-lime']){
    assert.ok(contrast(hex(tokens,name),dark)>=4.5,name+' must meet AA against brand-lava');
  }
});

test('every Random accent family meets AA with its declared foreground',()=>{
  const on=hex(themes,'brand-on-accent');
  for(const family of ['lava','ocean','hibiscus','lilac','lime']){
    const block=themes.match(new RegExp('data-random-family="'+family+'"\\]\\{([^}]*)\\}'))?.[1]||'';
    const accent=hex(block,'brand-accent');
    assert.ok(contrast(accent,on)>=4.5,family+' random accent contrast');
  }
});
