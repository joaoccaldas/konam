import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const promoPath=path.join(root,'promo.html');
const history=JSON.parse(fs.readFileSync(path.join(root,'content/company-history.json'),'utf8'));
const films=JSON.parse(fs.readFileSync(path.join(root,'content/tutorial-video-suite.json'),'utf8'));

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const replaceBlock=(html,name,content)=>{
  const start='<!--'+name+':start-->',end='<!--'+name+':end-->';
  const block=start+'\n'+content.trim()+'\n'+end;
  if(html.includes(start)&&html.includes(end))return html.replace(new RegExp(start+'[\\s\\S]*?'+end),block);
  return null;
};

const historyHtml=`
<section class="promo-section promo-history" id="history" data-company-history>
  <div class="promo-section-heading">
    <div><p class="t-label">01 / COMPANY HISTORY</p><h2 class="t-title">${esc(history.title)}<br><em>without pretending there was a master plan.</em></h2></div>
    <p>${esc(history.lede)}</p>
  </div>
  <div class="history-layout">
    <aside class="history-sticky">
      <span class="history-bib">#140.6</span>
      <p class="t-label">CURRENT POSTURE</p>
      <h3>${esc(history.current_posture)}</h3>
      <p>The history is told in phases rather than fake founding mythology. Each step exists because the previous one created the next useful problem.</p>
      <div class="history-proof"><span>PUBLIC STORY</span><b>ANONYMOUS FRONTEND</b><small>personal voice · no founder identity required</small></div>
    </aside>
    <div class="history-timeline">
      ${history.phases.map(p=>`<article class="history-phase" id="history-${esc(p.id)}"><span class="history-index">${esc(p.index)}</span><div><small>${esc(p.label)}</small><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><b>${esc(p.truth)}</b></div></article>`).join('\n')}
    </div>
  </div>
  <div class="history-principles">
    ${history.principles.map((p,i)=>`<article><span>0${i+1}</span><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></article>`).join('\n')}
  </div>
  <p class="history-note t-hand">a company history, except the company is still mostly a question with a very committed website.</p>
</section>`;

const grouped=new Map(films.groups.map(g=>[g.id,{...g,videos:films.videos.filter(v=>v.group===g.id)}]));
const filmsHtml=`
<section class="promo-section promo-film-suite" id="films" data-film-suite>
  <div class="promo-section-heading">
    <div><p class="t-label">04 / THE 9-PART FILM MAP</p><h2 class="t-title">Explain less.<br><em>Show the thing.</em></h2></div>
    <p>Nine short films form the tutorial spine: why this exists, how the real app works, and what the island becomes when you go deeper. They are optional context, never an onboarding gate.</p>
  </div>
  <div class="film-policy">
    <span>OPTIONAL</span><span>SKIPPABLE</span><span>NO AUTOPLAY AUDIO</span><span>≤ 15 SEC / FILM</span><span>VALUE BEFORE TUTORIAL</span>
  </div>
  <div class="film-groups">
    ${[...grouped.values()].map(g=>`<section class="film-group"><header><span>${esc(g.label)}</span><div><h3>${esc(g.title)}</h3><p>${esc(g.purpose)}</p></div></header><div class="film-grid">${g.videos.map(v=>`<article class="film-card" data-film-id="${esc(v.id)}"><div class="film-card-top"><b>0${v.index}</b><span>${Math.round(v.duration_seconds)}s</span></div><small>${esc(v.group).toUpperCase()}</small><h4>${esc(v.title)}</h4><p>${esc(v.hook)}</p><div class="film-beats">${v.beats.slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('')}</div></article>`).join('')}</div></section>`).join('\n')}
  </div>
  <div class="film-rule"><strong>Publication rule</strong><p>Playback appears only when a verified repository asset exists. No dead video controls, no local-file paths, no fake “watch” button.</p></div>
</section>`;

let html=fs.readFileSync(promoPath,'utf8');
let next=replaceBlock(html,'company-history',historyHtml);
if(next===null){
  const anchor='<section class="promo-section promo-start" id="start">';
  if(!html.includes(anchor))throw new Error('start section anchor missing');
  html=html.replace(anchor,'<!--company-history:start-->\n'+historyHtml+'\n<!--company-history:end-->\n\n'+anchor);
}else html=next;

next=replaceBlock(html,'tutorial-film-suite',filmsHtml);
if(next===null){
  const anchor='<section class="promo-section promo-real-tour promo-tutorial-theatre" id="tour">';
  if(!html.includes(anchor))throw new Error('tour section anchor missing');
  html=html.replace(anchor,'<!--tutorial-film-suite:start-->\n'+filmsHtml+'\n<!--tutorial-film-suite:end-->\n\n'+anchor);
}else html=next;

const navStart=html.indexOf('<nav id="fieldRailNav"');
const navEnd=html.indexOf('</nav>',navStart);
if(navStart<0||navEnd<0)throw new Error('field rail missing');
let nav=html.slice(navStart,navEnd+6);
if(!nav.includes('href="#history"')){
  nav=nav.replace('<a href="#start"', '<a href="#history" data-rail-link><span>01</span><b>History</b><small>Excel → island, somehow</small></a>\n    <a href="#start"');
}
if(!nav.includes('href="#films"')){
  nav=nav.replace('<a href="#tour"', '<a href="#films" data-rail-link><span>04</span><b>Film map</b><small>9 short ways to explain this</small></a>\n    <a href="#tour"');
}
const railNumbers={history:'01',start:'02',play:'03',films:'04',tour:'05',intern:'06',rewards:'07',world:'08',lab:'09',collab:'10',faq:'11'};
for(const [id,num] of Object.entries(railNumbers)){
  nav=nav.replace(new RegExp('(href="#'+id+'" data-rail-link><span>)[^<]+(</span>)'),'$1'+num+'$2');
}
html=html.slice(0,navStart)+nav+html.slice(navEnd+6);
const sectionNumbers=[
  ['01 / START HERE','02 / START HERE'],
  ['01 / HOW TO PLAY','03 / HOW TO PLAY'],
  ['03 / TUTORIAL THEATRE','05 / TUTORIAL THEATRE'],
  ['04 / THE FOUNDING 141','07 / THE FOUNDING 141'],
  ['05 / THE WORLD','08 / THE WORLD'],
  ['06 / THE LAB','09 / THE LAB'],
  ['08 / BUILD SOMETHING TOGETHER','10 / BUILD SOMETHING TOGETHER'],
  ['10 / FAQ','11 / FAQ']
];
for(const [from,to] of sectionNumbers)html=html.replace(from,to);
html=html.replace('Have a project?<br><em>The Intern has email.</em>','Have a project?<br><em>The Intern has a public inbox.</em>');
fs.writeFileSync(promoPath,html);
console.log('public story built · '+history.phases.length+' history phases · '+films.videos.length+' tutorial films');
