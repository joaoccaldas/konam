// ui/onboarding-questions.js
import { readStorage, writeStorage } from '../engine/storage.js';
import { applyStoredEvent, ensureProgression, LEVELS } from '../engine/progression.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const QUESTIONS=[
  {
    id:'kona-intent',tone:'arrival',mark:'01',
    kicker:'WHY ARE YOU HERE?',
    title:'What brings you to Kona?',
    note:'No wrong answer. Several questionable ones.',
    answers:[
      ['racing','RACE','I’m racing. This seemed sensible once.'],
      ['supporting','CREW','I’m supporting someone with expensive hobbies.'],
      ['dreaming','DREAM','I’m dreaming irresponsibly.'],
      ['curious','CURIOUS','I followed a bike here.'],
    ],
  },
  {
    id:'tri-history',tone:'credentials',mark:'02',
    kicker:'ATHLETIC CREDENTIALS',
    title:'How deep in the rabbit hole are we?',
    note:'This calibrates the amount of useful nonsense KONA is allowed to send your way.',
    answers:[
      ['never','ROOKIE','No triathlons yet. I do own shoes though.'],
      ['some','INITIATED','A few. I know where the body glide lives.'],
      ['many','REPEAT OFFENDER','Many. My holidays have transition areas.'],
      ['undefined','TECHNICALLY…','Define “done”.'],
    ],
  },
  {
    id:'kona-energy',tone:'energy',mark:'03',
    kicker:'IMPORTANT SCIENCE',
    title:'Pick your Kona energy.',
    note:'This may affect absolutely everything. Or a wallpaper. Science is developing.',
    answers:[
      ['lava','LAVA','Hot, fast, mildly unreasonable.'],
      ['ocean','OCEAN','Calm until it very much isn’t.'],
      ['garage','GARAGE','I came here for the machines.'],
      ['mystery','MYSTERY','Please do not explain everything yet.'],
    ],
  },
  {
    id:'tucker-dale',tone:'credentials',mark:'04',
    kicker:'CULTURAL BACKGROUND',
    title:'Have you seen Tucker & Dale vs. Evil?',
    note:'For the record.',
    answers:[['seen','YES','Yes.'],['not-seen','NO','Not yet.'],['unsure','UNSURE','I may be thinking of something else.']],
  },
  {
    id:'camp-miasma',tone:'arrival',mark:'05',
    kicker:'ACCOMMODATION PREFERENCE',
    title:'Would you accept a place at Camp Miasma?',
    note:'Assume the booking is available.',
    answers:[['accept','ACCEPT','Yes.'],['review','REVIEW','I would read the cancellation policy.'],['decline','DECLINE','I have made other arrangements.']],
  },
];

const load=()=>{
  try{return JSON.parse(readStorage('entryIntent')||'null')||{schema:1,answers:{}}}
  catch(_){return{schema:1,answers:{}}}
};
const save=data=>writeStorage('entryIntent',JSON.stringify(data));
const markCardsSeen=()=>writeStorage('onboardingCards','seen');

export function renderOnboardingQuestions(host,{onDone,onSkip}={}){
  let index=0,busy=false;
  const data=load();
  if(!data.answers||typeof data.answers!=='object'||Array.isArray(data.answers))data.answers={};
  const paint=()=>{
    busy=false;
    const q=QUESTIONS[index],answered=QUESTIONS.filter(q=>data.answers[q.id]).length;
    const progress=Math.round((answered/QUESTIONS.length)*100);
    const state=ensureProgression();
    const next=LEVELS.find(x=>x.level===Math.min(10,state.level+1));
    host.innerHTML='<section class="onboarding-question" data-onboarding-question data-onboarding-tone="'+esc(q.tone)+'">'+
      '<div class="onboarding-progress" aria-label="Onboarding progress"><span style="width:'+progress+'%"></span></div>'+
      '<div class="onboarding-step-mark" aria-hidden="true"><strong>'+esc(q.mark)+'</strong><span>OF '+String(QUESTIONS.length).padStart(2,'0')+'</span></div>'+
      '<div class="onboarding-question-copy"><p class="eyebrow">'+esc(q.kicker)+'</p><h2>'+esc(q.title)+'</h2><p>'+esc(q.note)+'</p></div>'+
      '<div class="onboarding-answer-grid">'+q.answers.map(([id,tag,label])=>'<button type="button" data-onboarding-answer="'+esc(id)+'"><small>'+esc(tag)+'</small><b>'+esc(label)+'</b><i aria-hidden="true">→</i></button>').join('')+'</div>'+
      '<div class="onboarding-reward"><small>YOUR COMPLETELY SERIOUS REWARD METER</small><b>+15 XP</b><span>'+(next?'Next: Level '+next.level+' · '+next.name:'You have become suspiciously powerful.')+'</span></div>'+
      '<div class="onboarding-actions"><button type="button" class="btn-text" data-onboarding-skip>Skip the interrogation</button><span>'+(index+1)+' / '+QUESTIONS.length+'</span></div>'+
    '</section>';
    host.querySelectorAll('[data-onboarding-answer]').forEach(btn=>btn.onclick=()=>{
      if(busy)return;busy=true;
      host.querySelectorAll('button').forEach(b=>b.disabled=true);
      btn.classList.add('is-picked');
      data.answers[q.id]=btn.dataset.onboardingAnswer;
      data.updated_at=new Date().toISOString();
      save(data);
      applyStoredEvent({type:'ONBOARDING_ANSWER',id:'onboarding:'+q.id,subject:q.id});
      setTimeout(()=>{
        if(index<QUESTIONS.length-1){index+=1;paint();return;}
        data.completed=true;save(data);markCardsSeen();onDone?.(data);
      },140);
    });
    host.querySelector('[data-onboarding-skip]').onclick=()=>{
      if(busy)return;busy=true;
      data.skipped=true;data.updated_at=new Date().toISOString();save(data);markCardsSeen();onSkip?.(data);
    };
  };
  paint();
}
