import fs from 'node:fs';

const TEMPLATE=fs.readFileSync(new URL('./template.html',import.meta.url),'utf8');
const APP_ORIGIN='https://joaoccaldas.github.io/konam/';
const RAW_ORIGIN='https://raw.githubusercontent.com/joaoccaldas/konam/main/';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const text=(value,name,max=3000,{optional=false}={})=>{
  if(optional&&(value===undefined||value===null||String(value).trim()===''))return '';
  if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Invalid '+name);
  return value.trim();
};
function date(value){
  if(typeof value!=='string'||value.length!==10||value[4]!=='-'||value[7]!=='-'||!/^\d+$/.test(value.slice(0,4)+value.slice(5,7)+value.slice(8,10))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw new Error('Invalid publication date');
  return value;
}
function https(value,name){
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new Error('Invalid '+name);
  return url.href;
}
function repoAsset(value,name,{raw=false}={}){
  const source=text(value,name,500);
  if(source.startsWith('https://'))return https(source,name);
  if(source.startsWith('/')||source.includes('..'))throw new Error('Invalid '+name);
  return https((raw?RAW_ORIGIN:APP_ORIGIN)+source.replace(/^\.\//,''),name);
}
function repoPage(value,name){
  const source=text(value,name,500);
  if(source.startsWith('https://'))return https(source,name);
  if(source.startsWith('/')||source.includes('..'))throw new Error('Invalid '+name);
  return https(APP_ORIGIN+source.replace(/^\.\//,''),name);
}
function fill(template,replacements){
  let out=template;
  for(const [key,value] of Object.entries(replacements))out=out.replaceAll('{{'+key+'}}',value);
  return out;
}
function renderStory(story,index){
  const intern=story.intern?'<div style="font-family:\\'Comic Sans MS\\',\\'Bradley Hand\\',cursive;font-size:13px;line-height:1.25;margin-top:7px;color:#282f36;">'+escape(story.intern)+'</div>':'';
  return \`<tr><td style="padding:14px 0;border-top:1px solid #b8b0a7;background:#f4efe7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4efe7;">
    <tr>
      <td width="29%" valign="middle" style="padding-right:14px;background:#f4efe7;">
        <img src="\${escape(story.image)}" alt="" width="185" style="display:block;width:100%;height:auto;border:0;border-radius:12px;background:#e6e9ed;">
      </td>
      <td width="71%" valign="middle" style="background:#f4efe7;">
        <div class="meta" style="font-size:10px;letter-spacing:.1em;color:#00a7c7;margin-bottom:5px;">\${String(index+1).padStart(2,'0')} / \${escape(story.category)} · \${escape(story.published_at)} · \${escape(story.source)}</div>
        <div class="story-title" style="font-family:Arial Black,Arial,Helvetica,sans-serif;font-size:27px;font-weight:900;line-height:1.02;letter-spacing:-.02em;margin-bottom:5px;">\${escape(story.headline)}</div>
        <div class="story-copy" style="font-size:14px;line-height:1.35;color:#282f36;margin-bottom:7px;">\${escape(story.summary)}</div>
        <a href="\${escape(story.url)}" style="color:#ff6a00;font-weight:800;text-decoration:none;">READ →</a>
        \${intern}
      </td>
    </tr>
  </table>
</td></tr>\`;
}

export function prepareNewsletter(input){
  const edition=date(input.edition_date);
  if(!Array.isArray(input.stories)||input.stories.length!==3)throw new Error('Exactly three verified stories are required');

  const bike=input.bike;
  if(!bike||bike.verified!==true)throw new Error('A verified Bike of the Day is required');
  const bikeId=text(bike.id,'bike id',120);
  const bikeName=text(bike.name||bike.label,'bike name',160);
  const bikeBrand=text(bike.brand||'KONA.m','bike brand',80);
  const bikeYear=bike.year===null||bike.year===undefined?'':String(bike.year);
  if(bikeYear&&!/^\d{4}$/.test(bikeYear))throw new Error('Invalid bike year');
  const bikeImage=repoAsset(bike.image,'bike image');
  const bikeGlb=repoAsset(bike.glb,'bike GLB',{raw:true});
  const bikeView=repoPage(bike.viewer_url||bike.viewer,'bike viewer');
  if(!/\.(?:webp|png|jpe?g)$/i.test(new URL(bikeImage).pathname))throw new Error('Bike preview must be a real image asset');
  if(!/\.glb$/i.test(new URL(bikeGlb).pathname))throw new Error('Bike download must be a GLB asset');

  const urls=new Set();
  const stories=input.stories.map(story=>{
    const published=date(story.published_at),age=(Date.parse(edition)-Date.parse(published))/86400000;
    if(age<0||age>7)throw new Error('Story is outside the verified seven-day fallback window');
    const url=https(story.url,'canonical URL');
    if(urls.has(url))throw new Error('Invalid or duplicate canonical URL');
    urls.add(url);
    if(story.verified!==true)throw new Error('Source facts and publication date must be verified before rendering');
    return {
      category:text(story.category,'category',50),
      published_at:published,
      source:text(story.source,'source',120),
      url,
      headline:text(story.headline,'headline',140),
      summary:text(story.summary,'summary',280),
      intern:text(story.intern,'Intern note',180,{optional:true}),
      image:repoAsset(story.image,'story image'),
      verified:true
    };
  });

  const intro=text(input.intro,'intro',180);
  const currently=text(input.intern_currently,'Intern currently',220);
  const published=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(edition+'T00:00:00Z')).toUpperCase();
  const yearLabel=bikeYear?' · '+bikeYear:'';
  const bikeDek=text(input.bike_dek||(\`\${bikeBrand} \${bikeName}\${yearLabel}. A real bike from the KONA.m 3D collection.\`),'bike dek',180);

  const html=fill(TEMPLATE,{
    PUBLISHED:escape(published),
    BIKE_IMAGE:escape(bikeImage),
    BIKE_ALT:escape(\`KONA.m \${bikeName}\${yearLabel} real 3D asset\`),
    BIKE_NAME:escape(bikeName+yearLabel),
    BIKE_DEK:escape(bikeDek),
    BIKE_VIEW_URL:escape(bikeView),
    BIKE_GLB_URL:escape(bikeGlb),
    STORIES:stories.map(renderStory).join(''),
    INTERN_CURRENTLY:escape(currently)
  });

  if(!html.includes('{{UNSUBSCRIBE_URL}}'))throw new Error('Missing unsubscribe placeholder');
  if(/{{(?:PUBLISHED|BIKE_|STORIES|INTERN_)/.test(html))throw new Error('Unresolved newsletter template placeholder');

  return {
    id:'intern-'+edition,
    subject:'Kona.m — The Intern read the internet · '+published,
    html,
    bike:{id:bikeId,name:bikeName,brand:bikeBrand,year:bike.year??null,image:bikeImage,glb:bikeGlb,viewer_url:bikeView,verified:true},
    stories
  };
}
