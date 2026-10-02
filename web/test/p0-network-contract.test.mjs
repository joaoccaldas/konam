import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../landing.template.html',import.meta.url),'utf8');

test('P0 entry has no static Three.js or GLB dependency',()=>{
 assert.equal(/three(?:\.module)?\.js|from ['"]three/.test(entry+html),false);
 assert.equal(/\.glb['"]/.test(entry+html),false);
});
test('hall runtime is requested only inside explicit openMuseum function',()=>{
 const occurrences=[...entry.matchAll(/loadScript\('app\/hall\.js'\)/g)];
 assert.equal(occurrences.length,1);
 const start=entry.indexOf('function openMuseum');
 const end=entry.indexOf('initAppShell()',start);
 assert.ok(start>=0&&end>start);
 assert.ok(entry.slice(start,end).includes("loadScript('app/hall.js')"));
});
test('first entry shows one-time playful questions before avatar setup',()=>{
 assert.match(entry,/function firstRunStep\(\)/);
 assert.match(entry,/onboardingCards/);
 assert.match(entry,/paintQuest\(firstRunStep\(\)\)/);
 assert.match(entry,/renderOnboardingQuestions/);
 assert.match(entry,/onSkip:\(\)=>paintQuest\('avatar'\)/);
 assert.match(entry,/renderAvatarRegistration/);
 assert.match(entry,/setEntryMode\('quest'\)/);
});
test('avatar completion enters Home without loading hall runtime',()=>{
 const avatar=entry.slice(entry.indexOf("if(step==='avatar')"),entry.indexOf("if(step==='save')"));
 assert.match(avatar,/enterApp\('home'\)/);
 assert.equal(avatar.includes("openMuseum("),false);
});

test('first-time shortcuts cannot bypass onboarding',()=>{
 assert.match(entry,/returningVisit && \['home','garage','collection','discover','plan','me','feed','travel'\]\.includes\(q\.get\('view'\)\)/);
});
