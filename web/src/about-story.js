const ROUTES=['home','short','scenic','unfiltered','final'];

const stories={
  short:{
    index:'01',
    title:'The Short Version',
    estimate:'~ 15 seconds',
    paragraphs:[
      '<strong>Before anything else: I am proud this exists.</strong>',
      'One of my favourite people recently inspired me to get back into triathlon.',
      'So, naturally, I made an Excel sheet to track the comeback.',
      'A lot of scattered pieces finally became one thing I could finish enough to share.',
      '<strong>Now there is an island.</strong>',
      'Here we are.'
    ],
    note:'Not finished. Finished enough to be real.',
    image:'assets/kona-years/queen-k.jpg'
  },
  scenic:{
    index:'02',
    title:'The Scenic Route',
    estimate:'~ 1 minute',
    intro:'It started with training.',
    path:[
      ['01','Training','Start somewhere.'],
      ['02','Excel','A simple sheet. At first.'],
      ['03','AI','A new way to learn by making.'],
      ['04','Bikes','Then bikes. Then 3D bikes.'],
      ['05','A room','The bikes needed somewhere to live.'],
      ['06','A museum','One room became a collection.'],
      ['07','An island','The collection needed a world.']
    ],
    paragraphs:[
      '<strong>Before the route gets longer: I am proud we got here.</strong>',
      'Not because Kona.m is finished, and not because I suddenly know what it is supposed to become. I am proud because pieces that had been scattered across different projects, different years and different versions of me finally became something whole enough to share.',
      'This also arrived during a hard stretch. Finishing one thing did not solve everything. It did prove that I could still take a pile of unfinished pieces and move them forward.',
      'There was no grand master plan. Just the next interesting puzzle.',
      '<strong>One bike. One room. One road. One problem.</strong>',
      'The whole picture did not need to be clear. Only the next piece.',
      'Somewhere along the way, the pieces started fitting together.',
      'That became Kona.m: a place to explore triathlon through identity, machines, stories, places and the small details that make the sport feel alive.'
    ],
    note:'Still looking for the box.',
    image:'assets/kona-years/kailua-bay.jpg'
  },
  unfiltered:{
    index:'03',
    title:'The Unfiltered / ADHD Version',
    estimate:'honestly, who knows?',
    paragraphs:[
      'Okay, so…',
      'It started with trying to get some energy back and getting back into triathlon.',
      'Normal response: <strong>start training.</strong>',
      'My response: <strong>Excel.</strong>',
      'Then the Excel sheet got more complicated. Then AI. Then bikes. Then 3D bikes. Then a room. Then several rooms. Then apparently an island.',
      '<strong>Side quest. Side quest. Completely unnecessary detail that is now absolutely essential. Side quest.</strong>',
      'And somewhere in all of this, something useful happened.',
      '<strong>It became fun to learn again.</strong>',
      'The project became a way to turn curiosity into something visible: learn one thing, build one thing, discover the next thing, connect ideas that were not supposed to live next to each other.',
      'Sometimes that means computer science next to bike history. Sometimes 3D next to race stories. Sometimes a tiny interface problem becomes a whole room because apparently that was necessary.',
      'The point is not to know the whole map. It is to take the next step. Fix one bike. One screen. One room. One road. See what happens. Move again.',
      'A lot of things get started. Fewer get finished. So this one matters.',
      '<strong>And I am proud of where this one is now.</strong>'
    ],
    sidequest:{
      title:'Five seconds, after a lot more than five seconds:',
      body:[
        'I had a package sitting there for more than a week. I needed to deliver it. I knew I needed to deliver it. Still, it stayed there.',
        'Then I counted down: five, four, three, two, one. I picked it up and moved.',
        'The action itself took seconds. The time before it was much longer. That does not automatically make the time before useless. Sometimes it is friction. Sometimes it is preparation. Usually it is a messy mixture of both.',
        'Those five seconds mattered because they turned preparation into movement.'
      ],
      countdown:'5 · 4 · 3 · 2 · 1',
      ending:'Pick it up. Move. The important part is not that it took five seconds. The important part is that the next action finally happened.'
    },
    ending:[
      'Kona.m feels like the larger version of that moment.',
      'Pieces of it have existed across projects and years. Some were useful. Some failed. Some were abandoned. Some were preparing the next thing without looking like progress at the time.',
      'During a hard stretch, enough of those pieces finally came together into the first project in a long time that I can look at and feel satisfied with.',
      '<strong>That does not mean stopping.</strong> It means I do not need to know the next destination in order to be proud that I reached this one.',
      'That is also the product philosophy.',
      'Not: <strong>figure everything out.</strong>',
      'More: <strong>take the next useful step.</strong>',
      'Explore. Learn. Build. Get lost for a bit. Come back. Keep moving.',
      'Eventually there is a picture where there used to be a pile of pieces.'
    ],
    note:'We are absolutely not calling it finished-finished.',
    image:'assets/kona-years/queen-k.jpg'
  }
};

function esc(s=''){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function routeFromUrl(){const r=new URL(location.href).searchParams.get('story')||'home';return ROUTES.includes(r)?r:'home'}
function href(route){return route==='home'?'about.html':`about.html?story=${route}`}
function go(route){history.pushState({route},'',href(route));render(route);window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
function wire(){document.querySelectorAll('[data-route]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.dataset.route)}))}
function nav(prev,next,progress){return `<nav class="about-story-nav" aria-label="Story navigation"><a href="${href(prev)}" data-route="${prev}">← Back</a><div class="about-progress about-progress--${progress}" aria-hidden="true"><span></span></div><a class="about-next" href="${href(next)}" data-route="${next}">Next <span aria-hidden="true">→</span></a></nav>`}
const photoCredit='<p class="photo-credit">Photo: dronepicr / Wikimedia Commons · <a href="credits.html">CC BY 2.0 & source credits</a></p>';
function hero(){return `<section class="about-hero"><div class="about-hero-copy"><span class="about-hand about-hero-note">well…<br>how long<br>do you have?</span><p class="about-kicker">ABOUT THIS COMPANY</p><h1>Why<br>this exists.</h1><p>Training, technology, bikes, places, side quests and a lot of curiosity. Some products take the scenic route.</p></div><div class="about-hero-media artifact artifact--photo"><img src="assets/kona-years/queen-k.jpg" alt="The Queen K highway landscape in Kona"><span class="about-hand about-photo-note">One piece.<br>Then the next.</span></div></section>`}
function choice(route,index,title,estimate,body,foot){return `<a class="about-choice" href="${href(route)}" data-route="${route}"><div class="about-choice-top"><span class="about-index">${index}</span><div><h2>${title}</h2><span class="about-estimate">${estimate}</span></div></div>${body.map(p=>`<p>${p}</p>`).join('')}<div class="about-choice-foot"><small>${foot}</small><span class="about-circle-arrow" aria-hidden="true">→</span></div></a>`}
function home(){return `<div class="about-shell">${hero()}${photoCredit}<section class="about-choices" aria-label="Choose a version of the story">
${choice('short','01','The Short Version','~ 15 seconds',['A comeback. An Excel sheet. One thing led to another.','Now there is an island.'],'Simple is enough.')}
${choice('scenic','02','The Scenic Route','~ 1 minute',['Training → Excel → AI → Bikes → Room → Museum → Island','The next puzzle piece became the product.'],'Curiosity leads the way.')}
${choice('unfiltered','03','The Unfiltered / ADHD Version','honestly, who knows?',['There were side quests. A lot of side quests.','Somehow the detours became the way of building.'],'Same brain. Bigger map.')}
</section></div>`}
function storyHead(s){return `<header class="about-story-head"><span class="about-index">${s.index}</span><div><h1>${s.title}</h1><span class="about-estimate">${s.estimate}</span></div></header>`}
function short(){const s=stories.short;return `<article class="about-shell about-story">${storyHead(s)}<div class="about-story-grid"><div class="about-story-copy">${s.paragraphs.map((p,i)=>`<p class="${i===0?'about-big':''}">${p}</p>`).join('')}</div><aside class="about-story-aside"><figure class="about-photo-card"><img src="${s.image}" alt="Kona road landscape"><figcaption>${s.note}</figcaption></figure>${photoCredit}</aside></div>${nav('home','scenic',33)}</article>`}
function scenic(){const s=stories.scenic;return `<article class="about-shell about-story">${storyHead(s)}<div class="about-story-grid"><div class="about-story-copy"><p class="about-big"><strong>${s.intro}</strong></p><div class="about-path">${s.path.map(([n,title,text])=>`<div class="about-path-item"><span class="about-path-num">${n}</span><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`).join('')}</div>${s.paragraphs.map(p=>`<p>${p}</p>`).join('')}</div><aside class="about-story-aside"><figure class="about-photo-card"><img src="${s.image}" alt="Kailua Bay"><figcaption>One bike.<br>One room.<br>One road.</figcaption></figure>${photoCredit}<div class="about-note">${s.note}</div></aside></div>${nav('short','unfiltered',66)}</article>`}
function unfiltered(){const s=stories.unfiltered;return `<article class="about-shell about-story about-unfiltered">${storyHead(s)}<div class="about-story-grid"><div class="about-story-copy">${s.paragraphs.map((p,i)=>`<p class="${i===0?'about-big about-hand':''}">${p}</p>`).join('')}<section class="about-sidequest" aria-label="Side quest"><div class="about-sidequest-label">${s.sidequest.title}</div>${s.sidequest.body.map(p=>`<p class="about-ui-copy">${p}</p>`).join('')}<div class="about-countdown">${s.sidequest.countdown}</div><p>${s.sidequest.ending}</p></section>${s.ending.map(p=>`<p>${p}</p>`).join('')}<h2 class="about-finished"><span>Finished enough to let you in.</span></h2><span class="about-hand about-self-check">${s.note}</span></div><aside class="about-story-aside"><figure class="about-photo-card"><img src="${s.image}" alt="Kona landscape"><figcaption>One piece. Then the next.</figcaption></figure>${photoCredit}<div class="about-note">Things escalated.</div></aside></div>${nav('scenic','final',100)}</article>`}
function final(){return `<section class="about-final"><div class="about-final-inner"><div class="about-hand">Anyway… enough about the route.</div><h1>Welcome<br>to Kona.m.</h1><p>Explore · discover · build · keep moving</p><a class="btn primary" href="./">Enter Kona.m <span aria-hidden="true">→</span></a></div></section>`}
function render(route=routeFromUrl()){const app=document.getElementById('aboutApp');app.innerHTML=route==='home'?home():route==='short'?short():route==='scenic'?scenic():route==='unfiltered'?unfiltered():final();document.title=route==='home'?'About this company · Kona.m':route==='final'?'Welcome to Kona.m':`${stories[route]?.title||'About'} · Kona.m`;wire();const h1=app.querySelector('h1');if(h1){h1.setAttribute('tabindex','-1');requestAnimationFrame(()=>h1.focus({preventScroll:true}))}}
addEventListener('popstate',()=>render(routeFromUrl()));
render();
