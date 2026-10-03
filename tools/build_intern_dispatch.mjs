#!/usr/bin/env node
// Generate the public Intern Dispatch from source-grounded feed metadata + explicit build notes.
// Never summarize article facts that are not present in the feed. The original publisher remains the authority.
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const feed=read('integrations/companion/feed.json');
const notes=read('integrations/companion/intern-notes.json');
if(feed.schema_version!==1||notes.schema_version!==1)throw new Error('unsupported Intern source schema');

const sources=new Map((feed.sources||[]).map(s=>[s.id,s]));
const items=(feed.items||[])
  .filter(i=>sources.has(i.source_id)&&/^https:\/\//.test(i.url||'')&&Number.isFinite(Date.parse(i.published_at)))
  .sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));

const byKind=new Map();
for(const item of items)if(!byKind.has(item.kind))byKind.set(item.kind,item);
const picked=[...byKind.values()];
for(const item of items)if(picked.length<6&&!picked.some(x=>x.id===item.id))picked.push(item);

const counts=items.reduce((m,i)=>(m[i.kind]=(m[i.kind]||0)+1,m),{});
const healthy=(feed.sources||[]).filter(s=>s.status==='ok').length;
const dominant=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'news';
const headline={
  kona:'The island has the loudest desk today.',
  video:'The athletes have the microphone today.',
  news:'The race world is doing race-world things again.'
}[dominant]||'The desk is full again.';
const generatedAt=[feed.checked_at,notes.updated_at].filter(Boolean).sort().at(-1)||feed.checked_at;

const commentary={
  kona:'Island desk. Useful context if you are in Kona, arriving soon or wondering what is changing around race week.',
  video:'Athlete camera. Watch the original before deciding what it means.',
  news:'Race desk. Open the original reporting for the full context.'
};

const dispatch={
  schema_version:1,
  generated_at:generatedAt,
  feed_checked_at:feed.checked_at,
  headline,
  dek:`I checked ${items.length} source items across ${feed.sources?.length||0} feeds. ${healthy}/${feed.sources?.length||0} sources reported healthy at the last refresh. These are the things I would open first, not invented summaries.`,
  source_policy:'Titles, publishers, timestamps and links come from the source feed. Intern commentary is clearly separated and never replaces the original reporting.',
  watch:picked.slice(0,6).map(item=>({
    title:item.title,
    url:item.url,
    published_at:item.published_at,
    kind:item.kind,
    source:sources.get(item.source_id)?.name||'Source',
    source_status:sources.get(item.source_id)?.status||'unknown',
    intern_note:commentary[item.kind]||'Worth a look. The original source has the facts.'
  })),
  build_notes:(notes.notes||[]).slice(0,4),
  contact:notes.contact||'konamundo@gmail.com'
};
fs.writeFileSync(path.join(root,'integrations/companion/intern-dispatch.json'),JSON.stringify(dispatch,null,2)+'\n');
console.log(`intern dispatch: ${dispatch.watch.length} watch items · ${dispatch.build_notes.length} build notes`);
