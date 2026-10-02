export function installState({standalone=false,native=false,ios=false,android=false,deferred=false}={}){
 if(native) return {kind:'native',show:false,action:'none',label:'Installed'};
 if(standalone) return {kind:'installed',show:false,action:'none',label:'Installed'};
 if(ios) return {kind:'ios-instructions',show:true,action:'instructions',label:'Add KONA to phone'};
 if(android&&deferred) return {kind:'android-prompt',show:true,action:'prompt',label:'Install KONA'};
 if(android) return {kind:'android-instructions',show:true,action:'instructions',label:'Add KONA to phone'};
 if(deferred) return {kind:'browser-prompt',show:true,action:'prompt',label:'Install KONA'};
 return {kind:'unavailable',show:true,action:'instructions',label:'How to install'};
}
export function installInstructions(kind){
 if(kind==='ios-instructions') return 'Safari: tap Share, then Add to Home Screen.';
 if(kind==='android-instructions') return 'Chrome: open the ⋮ menu, then choose Install app or Add to Home screen.';
 if(kind==='unavailable') return 'Use your browser menu and choose Install app or Add to Home screen if available.';
 return '';
}
