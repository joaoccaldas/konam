// Canonical server/editorial renderer for the existing Gmail newsletter.
// Never import recipient records into the public app or commit prepared editions.
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const text=(value,name,max=3000)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Invalid '+name);
  return value.trim();
};
function date(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw new Error('Invalid publication date');
  return value;
}
export function prepareNewsletter(input){
  const edition=date(input.edition_date);
  if(!Array.isArray(input.stories)||input.stories.length!==3)throw new Error('Exactly three verified stories are required');
  const urls=new Set();
  const stories=input.stories.map(story=>{
    const published=date(story.published_at),age=(Date.parse(edition)-Date.parse(published))/86400000;
    if(age<0||age>7)throw new Error('Story is outside the verified seven-day fallback window');
    const url=new URL(story.url);
    if(url.protocol!=='https:'||url.username||url.password||url.hash||urls.has(url.href))throw new Error('Invalid or duplicate canonical URL');
    urls.add(url.href);
    if(story.verified!==true)throw new Error('Source facts and publication date must be verified before rendering');
    return {category:text(story.category,'category',50),published_at:published,source:text(story.source,'source',120),url:url.href,headline:text(story.headline,'headline',200),summary:text(story.summary,'summary'),intern:text(story.intern,'Intern note',600),verified:true};
  });
  const intro=text(input.intro,'intro',1000),currently=text(input.intern_currently,'Intern currently',800);
  const published=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(edition+'T00:00:00Z'));
  const storyHTML=stories.map((s,index)=>`<tr><td style="padding:24px 0;border-top:1px solid #d8d0c7"><p style="font-size:11px;letter-spacing:.1em;color:#00a7c7">${String(index+1).padStart(2,'0')} / ${escape(s.category)} · ${escape(s.published_at)} · ${escape(s.source)}</p><h2 style="font:30px/1.1 Georgia,serif">${escape(s.headline)}</h2><p style="font-size:16px;line-height:1.65">${escape(s.summary)}</p><p style="font:16px/1.45 'Bradley Hand',cursive">The Intern: ${escape(s.intern)}</p><a href="${escape(s.url)}" style="display:inline-block;background:#ff6a00;color:#080b0e;text-decoration:none;font-weight:bold;padding:12px 16px;border-radius:999px">READ ORIGINAL →</a></td></tr>`).join('');
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kona.m · The Intern</title></head><body style="margin:0;background:#f4efe7;color:#080b0e;font-family:Manrope,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;word-break:break-word"><tr><td style="padding:8px 0 22px;border-bottom:1px solid #d8d0c7;font:34px Georgia,serif">Kona<span style="color:#ff6a00">.</span>m</td></tr><tr><td style="padding:30px 0"><p style="font-size:11px;letter-spacing:.1em;color:#00a7c7">THE INTERN READ THE INTERNET · ${escape(published.toUpperCase())}</p><h1 style="font:44px/1.05 Georgia,serif">Three things worth your time today.</h1><p style="font-size:16px;line-height:1.6">${escape(intro)}</p></td></tr>${storyHTML}<tr><td style="padding:20px;background:#efe6e8"><p style="font-size:11px;color:#ff2d6d;letter-spacing:.1em">THE INTERN, CURRENTLY</p><p style="font-size:16px;line-height:1.6">${escape(currently)}</p></td></tr><tr><td align="center" style="padding:30px 0"><p style="font:22px Georgia,serif">Race the version of yourself <em>you haven’t met yet.</em></p><p style="font-size:12px">You chose The Intern’s Kona.m newsletter. <a href="{{UNSUBSCRIBE_URL}}" style="color:#080b0e">Unsubscribe</a> · <a href="https://joaoccaldas.github.io/konam/privacy.html" style="color:#080b0e">Privacy & data</a></p></td></tr></table></td></tr></table></body></html>`;
  return {id:'intern-'+edition,subject:'Kona.m — The Intern read the internet · '+published,html,stories};
}
