import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareNewsletter} from '../../newsletter/render.mjs';
const input=()=>({edition_date:'2026-10-05',intro:'The Intern checked three originals.',intern_currently:'Everything worked. Suspicious.',stories:[1,2,3].map(n=>({category:'STORIES',published_at:'2026-10-04',source:'Source '+n,url:'https://example.test/story-'+n,headline:'Story '+n,summary:'A verified summary.',intern:'A separate opinion.',verified:true}))});
test('newsletter preserves the existing Intern edition identity and real unsubscribe placeholder',()=>{
 const edition=prepareNewsletter(input());assert.equal(edition.id,'intern-2026-10-05');assert.match(edition.subject,/The Intern read the internet/);assert.match(edition.html,/THE INTERN, CURRENTLY/);assert.match(edition.html,/\{\{UNSUBSCRIBE_URL\}\}/);assert.equal(edition.stories.length,3);
});
test('newsletter refuses missing, duplicate, unsafe, unverified, future or stale stories',()=>{
 for(const mutate of [x=>x.stories.pop(),x=>x.stories[1].url=x.stories[0].url,x=>x.stories[0].url='javascript:alert(1)',x=>x.stories[0].verified=false,x=>x.stories[0].published_at='2026-10-06',x=>x.stories[0].published_at='2026-09-27',x=>x.stories[0].published_at='2026-02-30']){const x=input();mutate(x);assert.throws(()=>prepareNewsletter(x));}
});
test('newsletter treats source titles and Intern commentary as text, including attribute delimiters',()=>{
 const x=input();x.intro='<script>alert(1)</script>';x.stories[0].headline='" onclick="bad';x.stories[0].url='https://example.test/story?a="';const html=prepareNewsletter(x).html;assert.doesNotMatch(html,/<script>|onclick="bad/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&quot; onclick=&quot;bad/);
});
