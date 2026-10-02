// runtime/viewport.js — the single owner of physical-phone / desktop-site layout context.
// Runs before CSS to avoid a desktop-layout flash when a phone requests a desktop site.
(function(){
  function apply(){
    const html=document.documentElement;
    const sw=screen.width||1e5,sh=screen.height||1e5;
    const short=Math.min(sw,sh);
    const vv=globalThis.visualViewport;
    const visualW=Math.max(1,vv?.width||innerWidth),visualH=Math.max(1,vv?.height||innerHeight);
    const landscape=visualW>visualH;
    const physical=landscape?Math.max(sw,sh):short;
    const splitOrFolded=visualW<Math.min(innerWidth,physical)*.72;
    const desktopViewPhone=short<=500&&innerWidth>820&&!splitOrFolded&&visualH>=260;
    const fit=desktopViewPhone?Math.max(1,innerWidth/Math.max(1,physical)):1;
    html.classList.toggle('phone-fit',desktopViewPhone);
    html.classList.toggle('physical-phone',short<=600);
    html.classList.toggle('viewport-landscape',landscape);
    html.classList.toggle('viewport-portrait',!landscape);
    html.style.setProperty('--fit',fit.toFixed(3));
    html.style.setProperty('--vvw',visualW+'px');
    html.style.setProperty('--vvh',visualH+'px');
    globalThis.__konaViewport={desktopViewPhone,physicalPhone:short<=600,fit,visualW,visualH,orientation:landscape?'landscape':'portrait'};
  }
  apply();
  addEventListener('resize',apply,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(apply,120),{passive:true});
  globalThis.visualViewport?.addEventListener('resize',apply,{passive:true});
  globalThis.visualViewport?.addEventListener('scroll',apply,{passive:true});
})();
