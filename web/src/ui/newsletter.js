import { subscribeNewsletter } from '../growth/newsletter.js';

export function openNewsletterDialog(){
  let dialog=document.getElementById('konaNewsletter');
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='konaNewsletter';dialog.className='kona-newsletter';dialog.setAttribute('aria-labelledby','newsletterTitle');
    dialog.innerHTML='<button type="button" class="newsletter-close" data-newsletter-close aria-label="Close newsletter signup">×</button><small>KONA.M · THE USEFUL EMAIL</small><h2 id="newsletterTitle">One email.<br>Worth opening.</h2><p>Race-week signals, interesting triathlon rabbit holes, one Intern note, and the occasional thing we built because somebody probably should.</p><form data-newsletter-form><label>Email<input type="email" name="email" autocomplete="email" inputmode="email" required maxlength="254" placeholder="you@example.com"></label><label class="newsletter-honeypot" aria-hidden="true">Company<input name="company" tabindex="-1" autocomplete="off"></label><button type="submit" class="kona-primary">Join the list →</button></form><p class="kona-source-note" data-newsletter-status role="status">Explicit opt-in only. No account required. We are not sending campaigns until the sender domain and unsubscribe flow are fully configured.</p>';
    document.body.append(dialog);
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.querySelector('[data-newsletter-close]').onclick=()=>dialog.close();
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    const form=dialog.querySelector('[data-newsletter-form]'),status=dialog.querySelector('[data-newsletter-status]');
    form.onsubmit=async e=>{
      e.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Adding you…';
      try{
        await subscribeNewsletter(form.elements.email.value,{company:form.elements.company.value});
        status.textContent='You are on the early list. Sending stays off until the verified Kona.m sender and unsubscribe path are live.';
        form.elements.email.disabled=true;button.textContent='Added';
      }catch(error){status.textContent=error.message||'Could not add you right now.';button.disabled=false;}
    };
  }
  dialog.showModal();
  dialog.querySelector('input[name=email]:not(:disabled)')?.focus();
}
