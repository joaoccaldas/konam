import { renderEntryProductStage } from './ui/visual-primitives.js';

renderEntryProductStage(document.getElementById('entryProductStage'));

const frame=document.querySelector('[data-native-frame]');
const label=document.querySelector('[data-native-label]');
const open=document.querySelector('[data-native-open]');

document.querySelectorAll('[data-native-room]').forEach(button=>{
  button.addEventListener('click',()=>{
    const src=button.dataset.nativeRoom;
    const name=button.dataset.nativeLabel||'Kona.m';
    if(frame) frame.src=src;
    if(label) label.textContent=name;
    if(open) open.href=src;
    document.querySelectorAll('[data-native-room]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
  });
});
