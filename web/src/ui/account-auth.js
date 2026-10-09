import {signInWithPassword,registerAccount,requestPasswordReset,resendConfirmation,updatePassword,currentUser,subscribeInternNewsletter,PUBLIC_SUPABASE_URL,PUBLIC_SUPABASE_KEY} from '../cloud/supabase-lite.js';

export async function renderNewsletterSignup(host,{onBack=()=>{},onAuth=()=>{}}={}) {
  host.innerHTML=`<section class="account-auth" aria-label="The Intern’s newsletter"><div class="account-story"><p class="account-kicker">THE INTERN READ THE INTERNET</p><h2>Three things<br><em>worth your time.</em></h2><p>Kona.m news, fresh discoveries and other cool projects. The Intern reads the internet so you don’t have to.</p><div class="account-field-note">A good detour.<br>In your inbox.</div></div><div class="account-panel artifact artifact--label"><p class="account-kicker">YOUR INBOX · YOUR PACE</p><h2>Get the newsletter.</h2><p class="account-hint">Optional. Every edition has an unsubscribe link.</p><div data-newsletter-access><p class="account-status" role="status">Checking your account…</p></div><div class="account-exits"><button class="btn text" type="button" data-back>Back to Kona.m</button><a class="btn text" href="privacy.html">Privacy & data</a></div></div></section>`;
  host.querySelector('[data-back]').onclick=onBack;
  const access=host.querySelector('[data-newsletter-access]'),user=await currentUser();
  if(!access.isConnected)return;
  if(!user?.email){
    access.innerHTML='<p class="account-hint">Sign in or create a Kona.m account to confirm your email. Then choose to join the newsletter. Exploring the museum stays free.</p><div class="account-exits"><button class="btn primary" type="button" data-newsletter-auth="register">Create account</button><button class="btn text" type="button" data-newsletter-auth="login">Sign in</button></div>';
    access.querySelectorAll('[data-newsletter-auth]').forEach(button=>button.onclick=()=>onAuth(button.dataset.newsletterAuth));return;
  }
  access.innerHTML='<form class="account-form"><p class="account-hint" data-newsletter-address></p><button class="btn primary" type="submit">Get The Intern’s newsletter <span aria-hidden="true">→</span></button><p class="account-status" role="status" aria-live="polite"></p></form>';
  access.querySelector('[data-newsletter-address]').textContent='Send it to '+user.email+'.';
  access.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const button=access.querySelector('[type=submit]'),status=access.querySelector('.account-status');
    if(button.disabled)return;button.disabled=true;status.textContent='Confirming your choice…';status.setAttribute('role','status');
    try{await subscribeInternNewsletter();status.textContent='You’re on the list. Your subscription is confirmed; every edition has an unsubscribe link.';button.remove();}
    catch(error){status.setAttribute('role','alert');status.textContent=readableError(error);button.disabled=false;}
  };
}

// Account access shares the entry shell. Account and newsletter consent are separate.
export function renderNewsletterUnsubscribe(host,token,{onBack=()=>{}}={}) {
  const valid=typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
  host.innerHTML=`<section class="account-auth" aria-label="The Intern’s newsletter"><div class="account-story"><p class="account-kicker">YOUR INBOX · YOUR PACE</p><h2>Three things worth your time.<br><em>You choose when.</em></h2><p>The Intern’s Kona.m newsletter.</p></div><div class="account-panel artifact artifact--label"><p class="account-kicker">THE INTERN READ THE INTERNET</p><h2>Your inbox. Your pace.</h2><p>${valid?'Unsubscribe from The Intern’s newsletter. Your Kona.m account and progress stay yours.':'This link is incomplete. Open the Unsubscribe link from your newsletter, or contact the operator on the privacy page.'}</p><form class="account-form"><p class="account-status" role="status" aria-live="polite"></p>${valid?'<button class="btn primary" type="submit">Unsubscribe <span aria-hidden="true">→</span></button>':''}</form><div class="account-exits"><button class="btn text" type="button" data-back>Back to Kona.m</button><a class="btn text" href="privacy.html">Privacy & data</a></div></div></section>`;
  host.querySelector('[data-back]').addEventListener('click',onBack);
  host.querySelector('form').addEventListener('submit',async event=>{
    event.preventDefault();if(!valid)return;
    const button=host.querySelector('[type=submit]'),status=host.querySelector('.account-status');
    if(!button||button.disabled)return;button.disabled=true;status.setAttribute('role','status');status.textContent='One moment…';
    try {
      const response=await fetch(PUBLIC_SUPABASE_URL+'/functions/v1/newsletter-subscribe',{
        method:'POST',headers:{apikey:PUBLIC_SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({unsubscribe:token})
      });
      if(!response.ok)throw new Error('Could not unsubscribe. Please try again or contact the operator.');
      const data=await response.json();if(data.status!=='unsubscribed')throw new Error('Could not confirm withdrawal. Please try again.');
      host.querySelector('.account-panel h2').textContent='You’re off the list.';
      status.textContent='You won’t receive future editions. Your account and progress stay yours.';button.remove();token='';
    }catch(error){status.setAttribute('role','alert');status.textContent=error instanceof TypeError?'Couldn’t reach the newsletter service. Check your connection and try again.':error.message;button.disabled=false;}
  });
}

export function renderAccountAuth(host,{mode='login',onSuccess=()=>{},onContinue=()=>{},onBack=()=>{},error=''}={}) {
  let active=['login','register','forgot','reset'].includes(mode)?mode:'login';
  let email='',pending=false;
  const titles={login:'Welcome back.',register:'Make it yours.',forgot:'Find your way back.',reset:'A fresh start.'};
  const labels={login:'Sign in',register:'Create account',forgot:'Send reset link',reset:'Save new password'};
  function paint(note='',failed=false) {
    host.innerHTML=`<section class="account-auth" aria-label="Your Kona.m account">
      <div class="account-story"><p class="account-kicker">YOUR KONA · YOUR PACE</p><h2>Race the version of yourself<br><em>you haven’t met yet.</em></h2><p>Your athlete. Your machine. Your next chapter.</p><div class="account-field-note">Keep your Kona close.<br>Take it with you.</div><p class="account-story-detail">An account lets you back up your progress and bring it to another device. You choose when to save or restore.</p></div>
      <div class="account-panel artifact artifact--label">
        <nav class="account-switch" aria-label="Account access"><button type="button" data-mode="login" aria-pressed="${active==='login'}">Sign in</button><button type="button" data-mode="register" aria-pressed="${active==='register'}">Create account</button></nav>
        <p class="account-kicker">${active==='register'?'01 · YOUR NEXT CHAPTER':'YOUR RACE-WEEK COMPANION'}</p><h2>${titles[active]}</h2>
        <form class="account-form">
          ${active!=='reset'?'<label for="account-email">Email address</label><input id="account-email" name="email" type="email" required maxlength="254" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false">':''}
          ${active!=='forgot'?`<label for="account-password">${active==='reset'?'New password':'Password'}</label><div class="account-password"><input id="account-password" name="password" type="password" required ${active==='login'?'':'minlength="12"'} maxlength="512" autocomplete="${active==='login'?'current-password':'new-password'}"><button type="button" data-show aria-label="Show password" aria-pressed="false">Show</button></div>`:''}
          ${active==='register'||active==='reset'?'<p class="account-hint">At least 12 characters. A few memorable words work well.</p><label for="account-confirm">Confirm password</label><input id="account-confirm" name="confirm" type="password" required minlength="12" maxlength="512" autocomplete="new-password">':''}
          ${active==='register'?'<label class="account-consent"><input type="checkbox" name="updates"><span><b>Get The Intern’s newsletter.</b><span>Three things worth your time: Kona.m news, fresh discoveries and other cool projects. The Intern reads the internet so you don’t have to. Optional — your Kona is yours either way.</span></span></label>':''}
          <p class="account-status" role="status" aria-live="polite" tabindex="-1"></p>
          <button class="btn primary" type="submit">${labels[active]} <span aria-hidden="true">→</span></button>
        </form>
        ${active==='login'?'<button class="btn text account-forgot" type="button" data-mode="forgot">Forgot password?</button>':''}
        <p class="account-hint">${active==='register'?'Confirm your email before signing in. ':''}Your progress stays on this device until you choose to back it up. <a href="privacy.html">Privacy & data</a></p>
        <div class="account-exits"><button class="btn text" type="button" data-local>Continue without account</button><button class="btn text" type="button" data-back>Back</button></div>
      </div></section>`;
    const form=host.querySelector('form'),status=host.querySelector('.account-status');
    if(form.elements.email)form.elements.email.value=email;
    status.textContent=note;status.setAttribute('role',failed?'alert':'status');
    const announce=(message,isError=false)=>{status.textContent=message;status.setAttribute('role',isError?'alert':'status');if(isError)status.focus();};
    const busy=value=>{pending=value;host.querySelectorAll('button,input').forEach(control=>control.disabled=value);};
    host.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{if(pending)return;email=form.elements.email?.value||email;active=button.dataset.mode;paint();host.querySelector('input')?.focus();}));
    host.querySelector('[data-local]').addEventListener('click',onContinue);
    host.querySelector('[data-back]').addEventListener('click',onBack);
    host.querySelector('[data-show]')?.addEventListener('click',event=>{
      const input=form.elements.password,show=input.type==='password';input.type=show?'text':'password';
      event.currentTarget.textContent=show?'Hide':'Show';event.currentTarget.setAttribute('aria-label',show?'Hide password':'Show password');event.currentTarget.setAttribute('aria-pressed',String(show));
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(pending)return;
      email=form.elements.email?.value.trim().toLowerCase()||email;
      const password=form.elements.password?.value;
      if(form.elements.confirm&&form.elements.confirm.value!==password){announce('Your passwords don’t match. Try those again.',true);return;}
      const wantsUpdates=form.elements.updates?.checked===true;
      busy(true);announce('One moment…');
      try {
        if(active==='login'){
          await signInWithPassword(email,password);await onSuccess();return;
        }
        if(active==='reset'){
          if(!await currentUser())throw new Error('This reset link has expired. Request a fresh link from Forgot password.');
          await updatePassword(password);active='login';paint('Password updated. Sign in with your new password.');return;
        }
        if(active==='forgot'){
          await requestPasswordReset(email);announce('If an account uses this address, you’ll receive a reset link. Check your spam folder too.');return;
        }
        const account=await registerAccount(email,password,{newsletter:wantsUpdates});
        const updateNote=wantsUpdates?' For a new account, confirming your email also confirms this optional newsletter subscription. Every edition has an unsubscribe link.':'';
        if(account.signedIn){await onSuccess();return;}
        announce('Check your inbox to confirm your email, then sign in. If you already have an account, use Sign in or Forgot password.'+updateNote);
        form.querySelector('[data-resend]')?.remove();
        const resend=document.createElement('button');resend.type='button';resend.dataset.resend='';resend.className='btn text';resend.textContent='Resend confirmation';
        resend.addEventListener('click',async()=>{if(pending)return;busy(true);try{await resendConfirmation(email);announce('Confirmation requested. Check your inbox and spam folder.'+updateNote);}catch(err){announce(readableError(err),true);}finally{busy(false);}});
        form.append(resend);
      } catch(err) {announce(readableError(err),true);}
      finally {
        // Never retain plaintext credentials in the DOM after a request.
        form.querySelectorAll('input[name=password],input[name=confirm]').forEach(input=>input.value='');busy(false);
      }
    });
  }
  paint(error,Boolean(error));
}

function readableError(error) {
  if(error?.status===429)return 'Too many attempts. Wait a little before trying again. Your local progress is safe.';
  if(error?.code==='invalid_credentials')return 'That email and password didn’t match. Try again or reset your password.';
  if(error?.code==='email_not_confirmed')return 'Confirm your email before signing in. Check your inbox and spam folder.';
  if(error instanceof TypeError)return 'Couldn’t reach the account service. Check your connection and try again.';
  return error?.message||'That didn’t work. Please try again.';
}
