import { inviteModel, whatsappInviteUrl, shareInvite } from '../growth/invite.js';
export function openInviteDialog(){
  let dialog=document.getElementById('konaInvite');
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='konaInvite';dialog.className='kona-invite';dialog.setAttribute('aria-labelledby','inviteTitle');
    // All URL values come from the fixed public product metadata; never include local state.
    dialog.innerHTML='<button type="button" class="invite-close" data-invite-close aria-label="Close invitation">×</button><small>KONA.M · BRING YOUR PEOPLE</small><h2 id="inviteTitle">Better with<br>a friend.</h2><p>Build your athlete. Choose your machine. Take the scenic route together.</p><div class="invite-actions"><button type="button" class="kona-primary" data-invite-native>Invite friends ↗</button><a class="btn-secondary invite-whatsapp" data-invite-whatsapp target="_blank" rel="noopener noreferrer">WhatsApp ↗</a><button type="button" class="btn-secondary" data-invite-copy>Copy invitation link</button></div><label class="invite-link">Your invitation link<input readonly aria-label="Kona.m invitation link" data-invite-link></label><p class="kona-source-note" data-invite-status role="status">No account, contacts or private progress included. You choose who receives it.</p>';
    document.body.append(dialog);
    // Keep the parent Studio drawer open; the native dialog owns keyboard interaction.
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.querySelector('[data-invite-link]').value=inviteModel().url;
    dialog.querySelector('[data-invite-whatsapp]').href=whatsappInviteUrl();
    const status=dialog.querySelector('[data-invite-status]');
    dialog.querySelector('[data-invite-close]').onclick=()=>dialog.close();
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    dialog.querySelector('[data-invite-native]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;const result=await shareInvite();status.textContent=result.ok?(result.method==='native'?'Invitation handed to your share app.':'Invitation link copied. Paste it wherever you like.'):(result.reason==='cancelled'?'Invitation cancelled.':'Sharing unavailable. Select the invitation link below to copy it.');b.disabled=false;};
    dialog.querySelector('[data-invite-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(inviteModel().url);status.textContent='Invitation link copied.';}catch{const input=dialog.querySelector('[data-invite-link]');input.focus();input.select();status.textContent='Select and copy this link manually.';}};
  }
  dialog.showModal();
}
