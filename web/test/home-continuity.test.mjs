import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');
const home=fs.readFileSync(new URL('../src/ui/home.js',import.meta.url),'utf8');
const raceSelf=fs.readFileSync(new URL('../src/ui/avatar-home.js',import.meta.url),'utf8');

test('Home is the shell surface and Race Self is entered explicitly',()=>{
  assert.match(shell,/function now\(\)[\s\S]*renderHomeSurface/);
  assert.match(shell,/async function raceSelf\(\)[\s\S]*renderAvatarHome/);
  assert.match(home,/data-home-self/);
  assert.doesNotMatch(home,/race-self-stage\.js|\.glb|THREE/);
});
test('User Studio keeps personal depth plus explicit companion shortcuts',()=>{
  for(const personal of ['Avatar','Bike Studio','Races','Collection','Progress','Settings']) assert.match(raceSelf,new RegExp(personal));
  assert.doesNotMatch(raceSelf,/Canyon Museum|Discover Kona|Race week/);
  assert.match(raceSelf,/Travel to Kona/);
  assert.match(raceSelf,/The Feed/);
  assert.doesNotMatch(raceSelf,/hub-launcher/);
  assert.match(raceSelf,/race-self-controls/);
});
test('five-tab app shell remains the only top-level map and Home means Home',()=>{
  assert.match(shell,/\[data-tab=home\]'\)\.onclick=now/);
  for(const tab of ['home','discover','garage','plan','me']) assert.match(shell,new RegExp('data-tab="'+tab+'"'));
  assert.equal((shell.match(/<button[^>]*data-tab=\"/g)||[]).length,5);
});
